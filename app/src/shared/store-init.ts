import { isSessionRevocationCode, type SessionRevocationCode } from "@memeover/shared";
import { emit, listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import i18n from "@/i18n";
import { toReplayItem } from "./history-expiry";
import { restoreOverlayMonitor } from "./overlay-window";
import { loadSettings } from "./settings";
import { useAppStore } from "./store";
import { desktopPlaybackEnabled } from "./stream-destination";
import type { DisplayQueueItem, OverlayHealth, Settings, WsStatus } from "./types";
import { decideStatusToast, INITIAL_TOAST_TRACKER } from "./ws-status-toasts";

export async function initOverlayStore(): Promise<void> {
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
		if (!desktopPlaybackEnabled(useAppStore.getState().settings)) return;
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

export async function initSettingsStore(): Promise<void> {
	await listen<string | null>("ws-join-error", (event) =>
		useAppStore.setState({ lastJoinError: event.payload }),
	);
	await listen<string[]>("ws-features-changed", (event) =>
		useAppStore.setState({ serverFeatures: event.payload }),
	);
	await listen<number | null>("guild-pause-changed", (event) =>
		useAppStore.getState().setGuildPausedUntil(event.payload),
	);
	// Track status transitions and toast errors only once per outage.
	let tracker = INITIAL_TOAST_TRACKER;

	await listen<SessionRevocationCode>("ws-session-revoked", (event) => {
		if (!isSessionRevocationCode(event.payload)) return;
		useAppStore.getState().setWsRevokedReason(event.payload);
		toast.error(i18n.t("toast.sessionRevoked"));
	});

	await listen<WsStatus>("ws-status-changed", (event) => {
		const status = event.payload;
		if (status === "connected") useAppStore.getState().setWsRevokedReason(null);
		const decision = decideStatusToast(
			tracker,
			status,
			Boolean(useAppStore.getState().wsRevokedReason),
		);
		if (decision.toast === "connected") {
			toast.success(i18n.t("toast.wsConnected"));
		} else if (decision.toast === "error") {
			toast.error(i18n.t("toast.wsError"));
		}
		tracker = decision.next;
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
