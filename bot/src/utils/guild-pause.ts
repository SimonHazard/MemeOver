import type { GuildConfig } from "./registry-state";
export const PAUSE_INDEFINITE = Number.MAX_SAFE_INTEGER;
export const MAX_TIMER_MS = 2_147_483_647;
export const PAUSE_CHOICES = {
	"5m": 300_000,
	"15m": 900_000,
	"30m": 1_800_000,
	"1h": 3_600_000,
	"2h": 7_200_000,
	indefinite: null,
} as const;
export type PauseChoice = keyof typeof PAUSE_CHOICES;
export function resolvePausedUntil(choice: PauseChoice, now: number): number {
	const duration = PAUSE_CHOICES[choice];
	return duration === null ? PAUSE_INDEFINITE : now + duration;
}
export function isPausedAt(
	cfg: Pick<GuildConfig, "paused_until"> | undefined,
	now: number,
): boolean {
	return cfg?.paused_until != null && cfg.paused_until > now;
}
export function expiryDelay(pausedUntil: number, now: number): number | null {
	return pausedUntil === PAUSE_INDEFINITE || pausedUntil <= now
		? null
		: Math.min(pausedUntil - now, MAX_TIMER_MS);
}
