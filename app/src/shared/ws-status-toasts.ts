import type { WsStatus } from "./types";

export interface ToastTracker {
	prev: WsStatus;
	errorToasted: boolean;
}

export const INITIAL_TOAST_TRACKER: ToastTracker = { prev: "disconnected", errorToasted: false };

export function decideStatusToast(
	tracker: ToastTracker,
	status: WsStatus,
	revoked: boolean,
): { toast: "connected" | "error" | null; next: ToastTracker } {
	if (status === "connected") {
		return {
			toast: tracker.prev !== "connected" ? "connected" : null,
			next: { prev: status, errorToasted: false },
		};
	}
	if (status === "error" && !tracker.errorToasted && !revoked) {
		return { toast: "error", next: { prev: status, errorToasted: true } };
	}
	return { toast: null, next: { ...tracker, prev: status } };
}
