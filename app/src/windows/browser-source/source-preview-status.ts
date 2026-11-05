import type { SessionRevocationCode } from "@memeover/shared";
import type { WsStatus } from "@/shared/types";

export type SourcePreviewStatus =
	| "connecting"
	| "connected"
	| "reconnecting"
	| "revoked"
	| "rejected";

/** What the preview pill says; a revoked or rejected session never reconnects on its own. */
export function sourcePreviewStatus(
	status: WsStatus,
	revoked: SessionRevocationCode | null,
	joinRejected: boolean,
): SourcePreviewStatus {
	if (revoked) return "revoked";
	if (joinRejected) return "rejected";
	if (status === "connected") return "connected";
	if (status === "connecting") return "connecting";
	return "reconnecting";
}
