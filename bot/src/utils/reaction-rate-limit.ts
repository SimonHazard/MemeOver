/**
 * Per-guild reaction rate limiter. Absorbs burst activity (raids, emoji spam
 * chains) before it reaches the overlay, where excessive animations would cost
 * CPU and clutter the screen. The window is fixed (not sliding) — simpler and
 * cheap: one compare + one increment per reaction.
 */

const MAX_PER_WINDOW = 10;
const WINDOW_MS = 1_000;

interface Bucket {
	count: number;
	windowStart: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Returns `true` if the reaction should be broadcast, `false` if the guild has
 * already burned its per-second budget. Callers must skip the broadcast when
 * `false` — there's no retry queue.
 */
export function canBroadcastReaction(guildId: string): boolean {
	const now = Date.now();
	const bucket = buckets.get(guildId);

	if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
		buckets.set(guildId, { count: 1, windowStart: now });
		return true;
	}

	if (bucket.count >= MAX_PER_WINDOW) return false;
	bucket.count++;
	return true;
}
