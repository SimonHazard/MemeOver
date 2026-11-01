import type { SessionRevocationCode } from "@memeover/shared";
import type { WsStatus } from "@/shared/types";

/** OBS's browser source injects `window.obsstudio` (obs-browser README). */
export const IN_OBS = typeof window !== "undefined" && "obsstudio" in window;

export type ObsPreviewStatus = "connecting" | "connected" | "reconnecting" | "revoked";

/** What the preview pill says; a revoked session never reconnects on its own. */
export function obsPreviewStatus(
	status: WsStatus,
	revoked: SessionRevocationCode | null,
): ObsPreviewStatus {
	if (revoked) return "revoked";
	if (status === "connected") return "connected";
	if (status === "connecting") return "connecting";
	return "reconnecting";
}
