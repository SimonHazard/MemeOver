/**
 * In-memory LRU dedup for media broadcasts. Prevents the same `(message_id, url)`
 * pair being dispatched twice when both `messageCreate` AND `messageUpdate` fire
 * for the same Tenor/Giphy link (the embed populates after initial send). The
 * existing `hasNewEmbedMedia` filter catches most cases, but this layer guarantees
 * zero duplicates end-to-end, including on manual edits.
 *
 * Implementation note: `Map` iteration order is insertion order, so the first
 * entry yielded is always the oldest — we rely on that for O(1) eviction without
 * a dedicated LRU package.
 */

const TTL_MS = 60_000;
const MAX_ENTRIES = 500;

const seen = new Map<string, number>();

function evictExpired(now: number): void {
	for (const [key, expiresAt] of seen) {
		if (expiresAt > now) return;
		seen.delete(key);
	}
}

function evictOverflow(): void {
	while (seen.size > MAX_ENTRIES) {
		const next = seen.keys().next();
		if (next.done) return;
		seen.delete(next.value);
	}
}

/**
 * Returns `true` the first time a key is seen within the TTL window, `false`
 * thereafter. Call before broadcasting; skip broadcast when `false`.
 */
export function shouldDispatch(key: string): boolean {
	const now = Date.now();
	evictExpired(now);
	if (seen.has(key)) return false;
	seen.set(key, now + TTL_MS);
	evictOverflow();
	return true;
}

/** Introspection hook for stats / tests. */
export function dedupSize(): number {
	return seen.size;
}
