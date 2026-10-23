import type { OverlayHealth } from "@/shared/types";

/** A peer that reconnects within this window is not announced; the overlay retries after 3 s. */
export const RECONNECT_GRACE_MS = 15_000;

export interface ConnectionTracker {
	/** Last member count; null until this socket receives its first snapshot. */
	count: number | null;
	/** Expiry times of recent departures that a reconnect may cancel out, oldest first. */
	departures: readonly number[];
}

export const INITIAL_CONNECTION_TRACKER: ConnectionTracker = { count: null, departures: [] };

/**
 * The first count is a snapshot, including this overlay, rather than a new arrival.
 * Arrivals first cancel recent departures, so a brief peer disconnect stays silent.
 * The tracker always advances, including while notifications are disabled or hidden.
 */
export function newlyConnectedCount(
	tracker: ConnectionTracker,
	count: number,
	now: number,
	enabled: boolean,
	health: OverlayHealth,
): { tracker: ConnectionTracker; announce: number } {
	if (tracker.count === null) return { tracker: { count, departures: [] }, announce: 0 };
	const departures = tracker.departures.filter((expiry) => expiry > now);
	const delta = count - tracker.count;
	if (delta <= 0) {
		const left = Array.from({ length: -delta }, () => now + RECONNECT_GRACE_MS);
		return { tracker: { count, departures: [...departures, ...left] }, announce: 0 };
	}
	const reconnects = Math.min(delta, departures.length);
	const arrivals = delta - reconnects;
	return {
		tracker: { count, departures: departures.slice(reconnects) },
		announce: enabled && health !== "closed" ? arrivals : 0,
	};
}
