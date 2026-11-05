import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { availableMonitors, primaryMonitor } from "@tauri-apps/api/window";
import { encodeSourceControls, type SourceHeartbeat } from "./browser-source";
import { sameMonitorPosition } from "./helpers";
import { loadSettings, patchSettings } from "./settings";
import { useAppStore } from "./store";
import type { BrowserSourceStartError, OverlayMonitor, Settings } from "./types";

// ─── Settings-window controls for the Stream tab and the tray ─────────────────

function toStartError(error: unknown): BrowserSourceStartError {
	return error === "restart_required" || error === "port_in_use" || error === "invalid_port"
		? error
		: "unknown";
}

/** Serve the browser source page on `port` for this session. The result is mirrored in the app store. */
export async function startBrowserSource(port: number): Promise<BrowserSourceStartError | null> {
	try {
		const running = await invoke<number>("start_browser_source", { port });
		useAppStore.setState({ browserSourceRunningPort: running, browserSourceError: null });
		return null;
	} catch (error) {
		console.warn("[Browser source] Could not start:", error);
		const code = toStartError(error);
		useAppStore.setState({ browserSourceError: code });
		return code;
	}
}

/** Mirrors the server's real state and restarts an enabled source whose server has died. */
export async function refreshBrowserSourceStatus(): Promise<void> {
	const running = await invoke<number | null>("browser_source_status");
	useAppStore.setState({ browserSourceRunningPort: running });
	if (running !== null) return;
	const settings = await loadSettings();
	if (settings.browserSourceEnabled) await startBrowserSource(settings.browserSourcePort);
}

/** A loaded page's latest report. In `tauri dev`, pages reach Vite and none ever arrives. */
export function readSourceHeartbeat(): Promise<SourceHeartbeat | null> {
	return invoke<SourceHeartbeat | null>("browser_source_heartbeat");
}

/**
 * Short side, in CSS pixels, of the screen showing the desktop overlay: the overlay covers it
 * in production. The browser source compares its own size to this to keep the proportions.
 */
export async function overlayReferenceSize(
	overlayMonitor: OverlayMonitor | null,
): Promise<number | null> {
	const monitors = await availableMonitors();
	const monitor =
		monitors.find(
			(candidate) => overlayMonitor && sameMonitorPosition(candidate.position, overlayMonitor),
		) ?? (await primaryMonitor());
	if (!monitor) return null;
	return Math.round(Math.min(monitor.size.width, monitor.size.height) / monitor.scaleFactor);
}

/** Clicking the tray check item toggles it natively: always reassert the persisted value. */
export function syncTrayOverlayMuted(muted: boolean): Promise<void> {
	return invoke("set_tray_overlay_muted", { muted });
}

/** Persist the desktop mute (the overlay applies it on `settings-changed`), then sync the tray. */
export async function setDesktopOverlayMuted(
	next: boolean | ((settings: Settings) => boolean),
): Promise<Settings> {
	const updated = await patchSettings((s) => ({
		...s,
		desktopOverlayMuted: typeof next === "function" ? next(s) : next,
	}));
	await syncTrayOverlayMuted(updated.desktopOverlayMuted).catch((error) =>
		console.warn("[Tray] Could not sync the mute checkmark:", error),
	);
	return updated;
}

/**
 * Publishes the streamer's skip, clear and moderation actions for loaded browser sources, which
 * read them on their next liveness check. Every action already passes through these events.
 */
async function publishSourceControls(initial: Settings): Promise<void> {
	let skip = 0;
	let clear = 0;
	let { mutedAuthors, hideAnonymous } = initial;
	const publish = () =>
		invoke("set_browser_source_controls", {
			value: encodeSourceControls({ skip, clear, mutedAuthors, hideAnonymous }),
		}).catch((error) => console.warn("[Browser source] Could not publish controls:", error));

	await listen("skip-current", () => {
		skip++;
		void publish();
	});
	await listen("clear-queue", () => {
		clear++;
		void publish();
	});
	await listen<Settings>("settings-changed", (event) => {
		({ mutedAuthors, hideAnonymous } = event.payload);
		void publish();
	});
	await publish();
}

/** Late enough at launch for the overlay to be listening, and light: one local request. */
const SOURCE_WATCHDOG_INTERVAL_MS = 30_000;

/**
 * Restarts an enabled source whose server has died or whose port has become free. Nothing shows
 * on stream when it cannot run, so a failure is announced once on the desktop overlay.
 */
function watchBrowserSource() {
	let announced = false;
	setInterval(() => {
		void refreshBrowserSourceStatus()
			.then(async () => {
				const { browserSourceRunningPort, browserSourceError } = useAppStore.getState();
				if (browserSourceRunningPort !== null || browserSourceError === null) {
					announced = false;
				} else if (!announced) {
					announced = true;
					await emit("browser-source-start-failed");
				}
			})
			.catch((error) => console.warn("[Browser source] Could not read status:", error));
	}, SOURCE_WATCHDOG_INTERVAL_MS);
}

/**
 * Settings window only, which loads (hidden) at every launch: relays the tray mute,
 * restores its checkmark, publishes the browser source's live controls and restarts it
 * when it was enabled.
 */
export async function initStreamControls(): Promise<void> {
	// Tray "Mute overlay": Rust only relays the click, this window owns the setting.
	await listen("overlay-mute-toggle-requested", () => {
		void setDesktopOverlayMuted((s) => !s.desktopOverlayMuted).catch((error) =>
			console.warn("[Tray] Could not toggle the overlay mute:", error),
		);
	});
	const settings = await loadSettings();
	await syncTrayOverlayMuted(settings.desktopOverlayMuted).catch((error) =>
		console.warn("[Tray] Could not sync the mute checkmark:", error),
	);
	await publishSourceControls(settings);
	if (settings.browserSourceEnabled) await startBrowserSource(settings.browserSourcePort);
	watchBrowserSource();
}
