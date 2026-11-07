import type { Settings } from "./types";

/** Source health deliberately cannot turn desktop playback back on. */
export function desktopPlaybackEnabled(
	settings: Pick<Settings, "browserSourceEnabled" | "streamDestination">,
): boolean {
	return !settings.browserSourceEnabled || settings.streamDestination !== "stream";
}
