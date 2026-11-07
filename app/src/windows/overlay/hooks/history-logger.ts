import { addToHistory } from "@/shared/history";
import { shouldLogToHistory } from "@/shared/history-expiry";
import type { DisplayQueueItem } from "@/shared/types";

/**
 * Logs an item that starts displaying to the persistent history store.
 * Pass it as `OverlayStage`'s `onCurrentChange`; only the desktop overlay logs history.
 */
export function logDisplayedItem(current: DisplayQueueItem | null): void {
	if (current === null || !shouldLogToHistory(current)) return;
	// Fire-and-forget: errors are non-critical
	void addToHistory(current).catch((err) => {
		console.warn("[History] Failed to log item:", err);
	});
}
