import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { loadSettings, patchSettings } from "./settings";
import { useAppStore } from "./store";
import type { Settings } from "./types";

// ─── Settings-window controls for the Stream tab and the tray ─────────────────

/** Error codes returned by `start_obs_source`; anything else is an unexpected failure. */
export type ObsSourceStartError = "restart_required" | "port_in_use" | "invalid_port" | "unknown";

function toStartError(error: unknown): ObsSourceStartError {
	return error === "restart_required" || error === "port_in_use" || error === "invalid_port"
		? error
		: "unknown";
}

/** Serve the OBS page on `port` for this session. The result is mirrored in the app store. */
export async function startObsSource(port: number): Promise<ObsSourceStartError | null> {
	try {
		const running = await invoke<number>("start_obs_source", { port });
		useAppStore.setState({ obsSourceRunningPort: running, obsSourceError: null });
		return null;
	} catch (error) {
		console.warn("[OBS source] Could not start:", error);
		const code = toStartError(error);
		useAppStore.setState({ obsSourceError: code });
		return code;
	}
}

export async function refreshObsSourceStatus(): Promise<void> {
	const running = await invoke<number | null>("obs_source_status");
	useAppStore.setState({ obsSourceRunningPort: running });
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
 * restores its checkmark and restarts the OBS source when it was enabled.
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
	if (settings.obsSourceEnabled) await startObsSource(settings.obsSourcePort);
}
