export const RECONNECT_BASE_MS = 1_000;
export const RECONNECT_MAX_MS = 30_000;

/** Delay before attempt `attempt` (0-based), doubling to 30 s with ±20% jitter. */
export function nextReconnectDelay(attempt: number, random: () => number = Math.random): number {
	const exponential = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** Math.max(0, attempt));
	const jitter = (random() * 2 - 1) * 0.2 * exponential;
	return Math.round(Math.max(RECONNECT_BASE_MS, exponential + jitter));
}
