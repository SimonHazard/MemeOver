/** Absorbs burst reaction activity before it hits the overlay. Fixed window. */

const MAX_PER_WINDOW = 10;
const WINDOW_MS = 1_000;
/** Bucket count above which we sweep stale entries. Keeps memory bounded when
 *  the bot is in many guilds but only a subset are reacting at any moment. */
const EVICT_THRESHOLD = 256;

interface Bucket {
	count: number;
	windowStart: number;
}

const buckets = new Map<string, Bucket>();

function evictStale(now: number): void {
	if (buckets.size < EVICT_THRESHOLD) return;
	const staleBefore = now - WINDOW_MS * 2;
	for (const [guildId, bucket] of buckets) {
		if (bucket.windowStart < staleBefore) buckets.delete(guildId);
	}
}

/** `false` = guild over quota this second, caller must skip broadcast. */
export function canBroadcastReaction(guildId: string): boolean {
	const now = Date.now();
	evictStale(now);
	const bucket = buckets.get(guildId);

	if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
		buckets.set(guildId, { count: 1, windowStart: now });
		return true;
	}

	if (bucket.count >= MAX_PER_WINDOW) return false;
	bucket.count++;
	return true;
}
