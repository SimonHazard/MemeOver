import type { SessionRevocationCode } from "@memeover/shared";
import { create } from "zustand";
import { isGuildPausedAt } from "./guild-pause";
import { dropMutedFromQueue, muteDropReason, mutedIdSet } from "./muted-authors";
import { canEnqueue } from "./queue-policy";
import { appendReactionWithinBudget } from "./reaction-budget";
import type {
	BrowserSourceStartError,
	DisplayQueueItem,
	FloatingReaction,
	FloatingReactionAnimation,
	OverlayHealth,
	Settings,
	StagedUpdate,
	WsStatus,
} from "./types";
import { DEFAULT_SETTINGS, FLOATING_REACTION_ANIMATIONS } from "./types";

export const MAX_QUEUE_SIZE = 50;

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

interface AppStore {
	lastJoinError: string | null;
	serverFeatures: string[];
	guildPausedUntil: number | null;
	guildPaused: boolean;
	setGuildPausedUntil: (value: number | null) => void;
	currentAuthorId: string | null;
	setCurrentAuthorId: (id: string | null) => void;
	wsRevokedReason: SessionRevocationCode | null;
	setWsRevokedReason: (reason: SessionRevocationCode | null) => void;
	/** The bot refused this socket's JOIN (unknown guild or invalid token); it stays open and idle. */
	wsJoinRejected: boolean;
	setWsJoinRejected: (rejected: boolean) => void;
	settings: Settings;
	updateSettings: (partial: Partial<Settings>) => void;

	queue: DisplayQueueItem[];
	enqueue: (item: DisplayQueueItem, opts?: { isReplay?: boolean }) => void;
	dequeue: () => void;
	clearQueue: () => void;

	queueSize: number;
	setQueueSize: (size: number) => void;

	wsStatus: WsStatus;
	setWsStatus: (status: WsStatus) => void;

	overlayHealth: OverlayHealth;
	setOverlayHealth: (health: OverlayHealth) => void;

	memberCount: number;
	setMemberCount: (count: number) => void;

	skipVersion: number;
	bumpSkip: () => void;

	reactions: FloatingReaction[];
	spawnReaction: (input: { emoji: string; emojiUrl?: string }) => void;
	removeReaction: (id: string) => void;
	clearReactions: () => void;

	isDisplaying: boolean;
	setIsDisplaying: (v: boolean) => void;

	updateAvailable: boolean;
	setUpdateAvailable: (v: boolean) => void;

	stagedUpdate: StagedUpdate | null;
	setStagedUpdate: (update: StagedUpdate) => void;

	browserSourceRunningPort: number | null;
	browserSourceError: BrowserSourceStartError | null;
}

export const useAppStore = create<AppStore>((set) => ({
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
	wsJoinRejected: false,
	setWsJoinRejected: (rejected) => set({ wsJoinRejected: rejected }),
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
			const isReplay = opts?.isReplay ?? item.replayOf !== undefined;
			const mutedReason = isReplay
				? null
				: muteDropReason(
						item,
						mutedIdSet(state.settings.mutedAuthors),
						state.settings.hideAnonymous,
					);
			if (mutedReason) {
				return state;
			}
			const reason = canEnqueue(state.queue, item, {
				maxQueue: MAX_QUEUE_SIZE,
				maxPerAuthor: state.settings.maxQueuedPerAuthor,
				isReplay,
			});
			if (reason) {
				console.debug("[Queue] Dropped item:", reason);
				return state;
			}
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

	stagedUpdate: null,
	setStagedUpdate: (update) => set({ stagedUpdate: update, updateAvailable: true }),

	browserSourceRunningPort: null,
	browserSourceError: null,
}));
