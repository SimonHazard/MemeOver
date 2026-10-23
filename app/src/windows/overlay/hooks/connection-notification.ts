import type { OverlayHealth } from "@/shared/types";

export interface ConnectionTracker {
	/** Last member count; null until this socket receives its first snapshot. */
	count: number | null;
}

export const INITIAL_CONNECTION_TRACKER: ConnectionTracker = { count: null };

/**
 * The first count is a snapshot, including this overlay, rather than a new arrival.
 * Counts cannot identify peers: a recent departure must not suppress a later arrival.
 * The bot deduplicates a replacement socket by install id while its old socket lingers.
 * The tracker always advances, including while notifications are disabled or hidden.
 */
export function newlyConnectedCount(
	tracker: ConnectionTracker,
	count: number,
	enabled: boolean,
	health: OverlayHealth,
): { tracker: ConnectionTracker; announce: number } {
	const arrivals = tracker.count === null ? 0 : Math.max(0, count - tracker.count);
	return {
		tracker: { count },
		announce: enabled && health !== "closed" ? arrivals : 0,
	};
}
