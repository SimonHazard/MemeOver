import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { loadSettings, patchSettings } from "./settings";
import { useAppStore } from "./store";
import type { Settings } from "./types";

// ─── Settings-window controls for the Stream tab and the tray ─────────────────

/** Error codes returned by `start_browser_source`; anything else is an unexpected failure. */
export type BrowserSourceStartError =
	| "restart_required"
	| "port_in_use"
	| "invalid_port"
	| "unknown";

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
 * Settings window only, which loads (hidden) at every launch: relays the tray mute,
 * restores its checkmark and restarts the browser source when it was enabled.
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
	if (settings.browserSourceEnabled) await startBrowserSource(settings.browserSourcePort);
}
