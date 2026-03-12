import { emit, listen } from "@tauri-apps/api/event";
import { Store } from "@tauri-apps/plugin-store";
import { toast } from "sonner";
import { create } from "zustand";
import i18n from "@/i18n";
import type { DisplayQueueItem, OverlayHealth, Settings, WsStatus } from "./types";
import { DEFAULT_SETTINGS } from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_QUEUE_SIZE = 50;

// ─── State shape ──────────────────────────────────────────────────────────────

interface AppStore {
	// Settings (loaded from Tauri Store by initOverlayStore / initSettingsStore)
	settings: Settings;
	updateSettings: (partial: Partial<Settings>) => void;

	// Display queue — accepts both MediaQueueItem and TextQueueItem
	queue: DisplayQueueItem[];
	enqueue: (item: DisplayQueueItem) => void;
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

	// True while the overlay is actively displaying an item (current !== null)
	isDisplaying: boolean;
	setIsDisplaying: (v: boolean) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>((set) => ({
	settings: DEFAULT_SETTINGS,
	updateSettings: (partial) => set((state) => ({ settings: { ...state.settings, ...partial } })),

	queue: [],
	enqueue: (item) =>
		set((state) => {
			if (state.queue.length >= MAX_QUEUE_SIZE) return state;
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

	isDisplaying: false,
	setIsDisplaying: (v) => set({ isDisplaying: v }),
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
	try {
		const store = await Store.load("settings.json");
		const saved = await store.get<Settings>("settings");
		if (saved) useAppStore.getState().updateSettings(saved);
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
		useAppStore.getState().enqueue(event.payload);
	});

	// Track overlay visibility so the WS hook can discard messages while hidden.
	// Also flush the queue immediately on hide — items queued on an invisible
	// window would be consumed pointlessly and wiped on the next reload anyway.
	await listen<OverlayHealth>("overlay-health-changed", (event) => {
		useAppStore.getState().setOverlayHealth(event.payload);
		if (event.payload === "closed") {
			useAppStore.getState().clearQueue();
		}
	});

	// Broadcast queue length and display state to the settings window whenever they change
	useAppStore.subscribe((state, prevState) => {
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
	// Track previous status to fire toasts only on genuine transitions.
	// This runs entirely outside React — toast() and i18n.t() are both safe here.
	let prevWsStatus: WsStatus = "disconnected";

	await listen<WsStatus>("ws-status-changed", (event) => {
		const status = event.payload;
		if (status === "connected" && prevWsStatus !== "connected") {
			toast.success(i18n.t("toast.wsConnected"));
		} else if (status === "error" && prevWsStatus !== "error") {
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
