import { expect, test } from "bun:test";
import {
	fallbackExpiryDelay,
	formatPausedUntil,
	isGuildPausedAt,
	PAUSE_INDEFINITE,
} from "./guild-pause";

test("guild pause detection", () => {
	expect(isGuildPausedAt(null, 100)).toBe(false);
	expect(isGuildPausedAt(100, 100)).toBe(false);
	expect(isGuildPausedAt(101, 100)).toBe(true);
	expect(isGuildPausedAt(PAUSE_INDEFINITE, 100)).toBe(true);
});
test("fallback expiry includes grace and caps finite timer", () => {
	expect(fallbackExpiryDelay(PAUSE_INDEFINITE, 0)).toBeNull();
	expect(fallbackExpiryDelay(1000, 500)).toBe(5500);
	expect(fallbackExpiryDelay(100, 500)).toBe(5000);
	expect(fallbackExpiryDelay(3_000_000_000, 0)).toBe(2_147_483_647);
});
test("until-resume has no clock label; timed label follows locale", () => {
	expect(formatPausedUntil(PAUSE_INDEFINITE, "en")).toBeNull();
	const time = Date.UTC(2026, 0, 1, 12, 30);
	expect(formatPausedUntil(time, "fr")).toBe(
		new Date(time).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" }),
	);
});
