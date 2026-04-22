/** Guards against duplicate broadcasts when messageCreate + messageUpdate both
 *  fire for the same Tenor/Giphy link. Relies on `Map`'s insertion-order
 *  iteration: the first yielded entry is always the oldest, giving O(1) eviction. */

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

/** `true` if the key has not been seen in the TTL window; caller must skip broadcast on `false`. */
export function shouldDispatch(key: string): boolean {
	const now = Date.now();
	evictExpired(now);
	if (seen.has(key)) return false;
	seen.set(key, now + TTL_MS);
	evictOverflow();
	return true;
}

export function dedupSize(): number {
	return seen.size;
}
