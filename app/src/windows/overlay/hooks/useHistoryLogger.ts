import { useEffect } from "react";
import { addToHistory } from "@/shared/history";
import type { DisplayQueueItem } from "@/shared/types";

/**
 * Logs each item that starts displaying to the persistent history store.
 * Must be called with the `current` value from useMediaDisplay.
 */
export function useHistoryLogger(current: DisplayQueueItem | null): void {
	useEffect(() => {
		if (current === null) return;
		// Fire-and-forget: errors are non-critical
		void addToHistory(current).catch((err) => {
			console.warn("[History] Failed to log item:", err);
		});
	}, [current]);
}
