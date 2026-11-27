import { MAX_TIMER_MS, PAUSE_INDEFINITE } from "@memeover/shared";

export { PAUSE_INDEFINITE } from "@memeover/shared";
export function isGuildPausedAt(pausedUntil: number | null, now: number): boolean {
	return pausedUntil !== null && pausedUntil > now;
}
export function formatPausedUntil(pausedUntil: number, locale: string): string | null {
	return pausedUntil === PAUSE_INDEFINITE
		? null
		: new Date(pausedUntil).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}
export function fallbackExpiryDelay(pausedUntil: number, now: number): number | null {
	return pausedUntil === PAUSE_INDEFINITE
		? null
		: Math.min(Math.max(0, pausedUntil - now) + 5000, MAX_TIMER_MS);
}
