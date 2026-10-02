import { isSessionRevocationCode, type SessionRevocationCode } from "@memeover/shared";
import { emit, listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import { create } from "zustand";
import i18n from "@/i18n";
import { isGuildPausedAt } from "./guild-pause";
import { restoreOverlayMonitor } from "./helpers";
import { toReplayItem } from "./history-expiry";
import { dropMutedFromQueue, muteDropReason, mutedIdSet } from "./muted-authors";
import type { OverlayTraceEntry } from "./overlay-trace";
import { pushTrace, traceMetadata } from "./overlay-trace";
import { canEnqueue } from "./queue-policy";
import { appendReactionWithinBudget } from "./reaction-budget";
import { loadSettings } from "./settings";
import type {
	DisplayQueueItem,
	FloatingReaction,
	FloatingReactionAnimation,
	OverlayHealth,
	Settings,
	WsStatus,
} from "./types";
import { DEFAULT_SETTINGS, FLOATING_REACTION_ANIMATIONS } from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_QUEUE_SIZE = 50;
let emitQueueTrace: ((entry: OverlayTraceEntry) => void) | undefined;

const REACTION_PRESET_TIMING: Record<
	FloatingReactionAnimation,
	Pick<FloatingReaction, "fadeInPct" | "fadeOutPct">
> = {
	straight: { fadeInPct: 12, fadeOutPct: 78 },
	serpentine: { fadeInPct: 10, fadeOutPct: 84 },
	bounce: { fadeInPct: 6, fadeOutPct: 90 },
	confetti: { fadeInPct: 8, fadeOutPct: 82 },
	pop: { fadeInPct: 7, fadeOutPct: 78 },
	firework: { fadeInPct: 8, fadeOutPct: 72 },
};

function resolveReactionAnimation(settings: Settings): FloatingReactionAnimation {
	if (settings.floatingReactionPreset !== "random") return settings.floatingReactionPreset;
	return FLOATING_REACTION_ANIMATIONS[
		Math.floor(Math.random() * FLOATING_REACTION_ANIMATIONS.length)
	] as FloatingReactionAnimation;
}

// ─── State shape ──────────────────────────────────────────────────────────────

interface AppStore {
	trace: OverlayTraceEntry[];
	clearTrace: () => void;
	lastJoinError: string | null;
	serverFeatures: string[];
	guildPausedUntil: number | null;
	guildPaused: boolean;
	setGuildPausedUntil: (value: number | null) => void;
	currentAuthorId: string | null;
	setCurrentAuthorId: (id: string | null) => void;
	wsRevokedReason: SessionRevocationCode | null;
	setWsRevokedReason: (reason: SessionRevocationCode | null) => void;
	// Settings (loaded from Tauri Store by initOverlayStore / initSettingsStore)
	settings: Settings;
	updateSettings: (partial: Partial<Settings>) => void;

	// Display queue — accepts both MediaQueueItem and TextQueueItem
	queue: DisplayQueueItem[];
	enqueue: (item: DisplayQueueItem, opts?: { isReplay?: boolean }) => void;
	dequeue: () => void;
	clearQueue: () => void;

	// Queue size mirror — updated via Tauri event "queue-size-changed" in the settings window
	queueSize: number;
	setQueueSize: (size: number) => void;

	// WebSocket connection status
	wsStatus: WsStatus;
	setWsStatus: (status: WsStatus) => void;

	// Overlay window health (alive = visible, closed = destroyed)
	overlayHealth: OverlayHealth;
	setOverlayHealth: (health: OverlayHealth) => void;

	// Number of overlay clients connected to the same guild (broadcast by bot)
	memberCount: number;
	setMemberCount: (count: number) => void;

	// Incremented each time the settings window requests a skip of the current item
	skipVersion: number;
	bumpSkip: () => void;

	// Floating reactions in flight on the overlay (independent of the media queue)
	reactions: FloatingReaction[];
	spawnReaction: (input: { emoji: string; emojiUrl?: string }) => void;
	removeReaction: (id: string) => void;
	clearReactions: () => void;

	// True while the overlay is actively displaying an item (current !== null)
	isDisplaying: boolean;
	setIsDisplaying: (v: boolean) => void;

	// True when the Tauri updater has detected a newer release on GitHub
	updateAvailable: boolean;
	setUpdateAvailable: (v: boolean) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>((set) => ({
	trace: [],
	clearTrace: () => set({ trace: [] }),
	lastJoinError: null,
	serverFeatures: [],
	guildPausedUntil: null,
	guildPaused: false,
	setGuildPausedUntil: (value) =>
		set((state) => {
			const paused = isGuildPausedAt(value, Date.now());
			return {
				guildPausedUntil: paused ? value : null,
				guildPaused: paused,
				queue: paused ? [] : state.queue,
			};
		}),
	wsRevokedReason: null,
	setWsRevokedReason: (reason) => set({ wsRevokedReason: reason }),
	currentAuthorId: null,
	setCurrentAuthorId: (id) => set({ currentAuthorId: id }),
	settings: DEFAULT_SETTINGS,
	updateSettings: (partial) =>
		set((state) => {
			const settings = { ...state.settings, ...partial };
			const muted = mutedIdSet(settings.mutedAuthors);
			const skip =
				state.currentAuthorId !== null &&
				muteDropReason({ author_id: state.currentAuthorId }, muted, settings.hideAnonymous) !==
					null;
			return {
				settings,
				queue: dropMutedFromQueue(state.queue, muted, settings.hideAnonymous),
				skipVersion: state.skipVersion + (skip ? 1 : 0),
			};
		}),

	queue: [],
	enqueue: (item, opts) =>
		set((state) => {
			const mutedReason = muteDropReason(
				item,
				mutedIdSet(state.settings.mutedAuthors),
				state.settings.hideAnonymous,
			);
			if (mutedReason) {
				emitQueueTrace?.({
					id: crypto.randomUUID(),
					at: Date.now(),
					...traceMetadata(JSON.stringify(item)),
					decision: "dropped",
					reason: mutedReason,
				});
				return state;
			}
			const reason = canEnqueue(state.queue, item, {
				maxQueue: MAX_QUEUE_SIZE,
				maxPerAuthor: state.settings.maxQueuedPerAuthor,
				isReplay: opts?.isReplay ?? item.replayOf !== undefined,
			});
			if (reason) {
				emitQueueTrace?.({
					id: crypto.randomUUID(),
					at: Date.now(),
					...traceMetadata(JSON.stringify(item)),
					decision: "dropped",
					reason,
				} satisfies OverlayTraceEntry);
				if (reason === "author_limit") console.debug("[Queue] Dropped item:", reason);
				return state;
			}
			emitQueueTrace?.({
				id: crypto.randomUUID(),
				at: Date.now(),
				...traceMetadata(JSON.stringify(item)),
				decision: "queued",
			} satisfies OverlayTraceEntry);
			return { queue: [...state.queue, item] };
		}),
	dequeue: () => set((state) => ({ queue: state.queue.slice(1) })),
	clearQueue: () => set({ queue: [] }),

	queueSize: 0,
	setQueueSize: (size) => set({ queueSize: size }),

	wsStatus: "disconnected",
	setWsStatus: (status) => set({ wsStatus: status }),

	overlayHealth: "alive",
	setOverlayHealth: (health) => set({ overlayHealth: health }),

	memberCount: 0,
	setMemberCount: (count) => set({ memberCount: count }),

	skipVersion: 0,
	bumpSkip: () => set((state) => ({ skipVersion: state.skipVersion + 1 })),

	reactions: [],
	spawnReaction: ({ emoji, emojiUrl }) =>
		set((state) => {
			const settings = state.settings;
			const animation = resolveReactionAnimation(settings);
			const preset = REACTION_PRESET_TIMING[animation];
			const direction: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
			const reaction: FloatingReaction = {
				id: crypto.randomUUID(),
				emoji,
				emojiUrl,
				leftPct: animation === "bounce" ? (direction === 1 ? -8 : 108) : 12 + Math.random() * 76,
				durationMs: settings.floatingReactionDuration * 1000,
				animation,
				opacityPct: settings.floatingReactionOpacity,
				sizeVmin: settings.floatingReactionSize,
				fadeInPct: preset.fadeInPct,
				fadeOutPct: preset.fadeOutPct,
				amplitudeVw: 7 + Math.random() * 5,
				direction,
				rotationDeg: direction * (6 + Math.random() * 12),
			};
			return { reactions: appendReactionWithinBudget(state.reactions, reaction) };
		}),
	removeReaction: (id) =>
		set((state) => ({ reactions: state.reactions.filter((r) => r.id !== id) })),
	clearReactions: () => set({ reactions: [] }),

	isDisplaying: false,
	setIsDisplaying: (v) => set({ isDisplaying: v }),

	updateAvailable: false,
	setUpdateAvailable: (v) => set({ updateAvailable: v }),
}));

// ─── Side-effect init (called from main.tsx, outside React) ───────────────────

/**
 * Overlay window init:
 * - Loads persisted settings from disk into Zustand
 * - Subscribes to "settings-changed" Tauri events emitted by the settings window
 * - Emits "queue-size-changed" whenever the queue length changes (consumed by settings window)
 * - Listens for "replay-item" to re-enqueue a history item from the settings window
 */
export async function initOverlayStore(): Promise<void> {
	emitQueueTrace = (entry) => {
		void emit("overlay-trace", entry).catch(() => {});
	};
	void emit("guild-pause-changed", null);
	try {
		const settings = await loadSettings();
		useAppStore.getState().updateSettings(settings);
		// Restore overlay to the saved monitor before show() is called.
		// Must be awaited so the window is on the correct monitor when it becomes visible.
		if (settings.overlayMonitor) {
			await restoreOverlayMonitor(settings.overlayMonitor);
		}
	} catch (err) {
		console.warn("[Store] Could not load settings:", err);
	}

	await listen<Settings>("settings-changed", (event) => {
		useAppStore.getState().updateSettings(event.payload);
	});

	await listen("clear-queue", () => {
		useAppStore.getState().clearQueue();
	});

	await listen("skip-current", () => {
		useAppStore.getState().bumpSkip();
	});

	await listen<DisplayQueueItem>("replay-item", (event) => {
		useAppStore
			.getState()
			.enqueue(toReplayItem(event.payload, crypto.randomUUID()), { isReplay: true });
	});

	// Track overlay visibility so the WS hook can discard messages while hidden.
	// Also flush the queue immediately on hide — items queued on an invisible
	// window would be consumed pointlessly and wiped on the next reload anyway.
	await listen<OverlayHealth>("overlay-health-changed", (event) => {
		useAppStore.getState().setOverlayHealth(event.payload);
		if (event.payload === "closed") {
			useAppStore.getState().clearQueue();
			useAppStore.getState().clearReactions();
		}
	});

	// Broadcast queue length and display state to the settings window whenever they change
	useAppStore.subscribe((state, prevState) => {
		if (state.guildPausedUntil !== prevState.guildPausedUntil)
			void emit("guild-pause-changed", state.guildPausedUntil);
		if (state.queue.length !== prevState.queue.length) {
			void emit("queue-size-changed", state.queue.length);
		}
		if (state.isDisplaying !== prevState.isDisplaying) {
			void emit("overlay-displaying-changed", state.isDisplaying);
		}
	});
}

/**
 * Settings window init:
 * - Subscribes to "ws-status-changed" Tauri events emitted by the overlay window
 * - Subscribes to "overlay-health-changed" Tauri events emitted by Rust
 * - Subscribes to "queue-size-changed" Tauri events emitted by the overlay window
 * - Subscribes to "member-count-changed" Tauri events emitted by the overlay window
 */
export async function initSettingsStore(): Promise<void> {
	await listen<OverlayTraceEntry>("overlay-trace", (event) =>
		useAppStore.setState((state) => ({ trace: pushTrace(state.trace, event.payload) })),
	);
	await listen<string | null>("ws-join-error", (event) =>
		useAppStore.setState({ lastJoinError: event.payload }),
	);
	await listen<string[]>("ws-features-changed", (event) =>
		useAppStore.setState({ serverFeatures: event.payload }),
	);
	await listen<number | null>("guild-pause-changed", (event) =>
		useAppStore.getState().setGuildPausedUntil(event.payload),
	);
	// Track previous status to fire toasts only on genuine transitions.
	// This runs entirely outside React — toast() and i18n.t() are both safe here.
	let prevWsStatus: WsStatus = "disconnected";

	await listen<SessionRevocationCode>("ws-session-revoked", (event) => {
		if (!isSessionRevocationCode(event.payload)) return;
		useAppStore.getState().setWsRevokedReason(event.payload);
		toast.error(i18n.t("toast.sessionRevoked"));
	});

	await listen<WsStatus>("ws-status-changed", (event) => {
		const status = event.payload;
		if (status === "connected") useAppStore.getState().setWsRevokedReason(null);
		if (status === "connected" && prevWsStatus !== "connected") {
			toast.success(i18n.t("toast.wsConnected"));
		} else if (
			status === "error" &&
			prevWsStatus !== "error" &&
			!useAppStore.getState().wsRevokedReason
		) {
			toast.error(i18n.t("toast.wsError"));
		}
		prevWsStatus = status;
		useAppStore.getState().setWsStatus(status);
	});

	await listen<OverlayHealth>("overlay-health-changed", (event) => {
		useAppStore.getState().setOverlayHealth(event.payload);
	});

	await listen<number>("queue-size-changed", (event) => {
		useAppStore.getState().setQueueSize(event.payload);
	});

	await listen<number>("member-count-changed", (event) => {
		useAppStore.getState().setMemberCount(event.payload);
	});

	await listen<boolean>("overlay-displaying-changed", (event) => {
		useAppStore.getState().setIsDisplaying(event.payload);
	});
}
