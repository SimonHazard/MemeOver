// ─── OBS guide facts ──────────────────────────────────────────────────────────
// Everything the Stream tab tells streamers to look for or copy lives here so a
// rename on the Rust side (or a change in what OBS picks up) fails a test.

/** Title of the overlay window, as OBS lists it. Must equal `.title(…)` in lib.rs. */
export const OBS_OVERLAY_WINDOW_TITLE = "MemeOver Overlay";

/** OBS knowledge base article on Application Audio Capture and its VB-Cable workaround. */
export const OBS_APP_AUDIO_CAPTURE_GUIDE_URL =
	"https://obsproject.com/kb/application-audio-capture-guide";

/** VB-Audio Virtual Cable download page, used by the isolated-audio route. */
export const VB_CABLE_URL = "https://vb-audio.com/Cable/";

/**
 * Whether OBS's "Application Audio Capture (BETA)" was verified to pick up the
 * overlay's sound. Windows plays it under "Microsoft Edge WebView2", and a streamer
 * reported that the per-app source did not show it. Flip only after a real
 * Windows + OBS check; it is never detected at runtime.
 */
export const APP_CAPTURE_VERIFIED = false;

/**
 * - `desktop-audio`: OBS's default global Desktop Audio, which includes MemeOver.
 * - `app-capture`: OBS "Application Audio Capture" on the overlay window.
 * - `virtual-cable`: WebView2 routed to VB-Cable, captured as an OBS audio input.
 */
export type ObsAudioRoute = "desktop-audio" | "app-capture" | "virtual-cable";

/** Audio routes in the order the guide presents them, simplest first. */
export function guideAudioRoutes(appCaptureWorks: boolean): ObsAudioRoute[] {
	return appCaptureWorks
		? ["desktop-audio", "app-capture", "virtual-cable"]
		: ["desktop-audio", "virtual-cable"];
}
