import { expect, test } from "bun:test";
import {
	expiryDelay,
	isPausedAt,
	MAX_TIMER_MS,
	PAUSE_CHOICES,
	PAUSE_INDEFINITE,
	resolvePausedUntil,
} from "./guild-pause";
import { normalizeRegistry } from "./registry-state";

test("pause choices, indefinite and expiry are bounded", () => {
	for (const choice of Object.keys(PAUSE_CHOICES) as (keyof typeof PAUSE_CHOICES)[])
		expect(resolvePausedUntil(choice, 1000)).toBe(
			choice === "indefinite" ? PAUSE_INDEFINITE : 1000 + (PAUSE_CHOICES[choice] ?? 0),
		);
	expect(expiryDelay(PAUSE_INDEFINITE, 0)).toBeNull();
	expect(expiryDelay(10, 10)).toBeNull();
	expect(expiryDelay(MAX_TIMER_MS + 100, 0)).toBe(MAX_TIMER_MS);
	expect(expiryDelay(100, 10)).toBe(90);
});
test("pause gate handles absent, expired and active configs", () => {
	expect(isPausedAt(undefined, 10)).toBe(false);
	expect(isPausedAt({ paused_until: null }, 10)).toBe(false);
	expect(isPausedAt({ paused_until: 10 }, 10)).toBe(false);
	expect(isPausedAt({ paused_until: 11 }, 10)).toBe(true);
	expect(isPausedAt({ paused_until: PAUSE_INDEFINITE }, 10)).toBe(true);
});
test("pause normalization migrates missing softly and repairs invalid", () => {
	const cfg = {
		token: "t",
		channel_ids: [],
		allow_bot_app_sources: false,
		registered_at: 1,
		last_active_at: null,
		unique_client_ids: [],
	};
	const missing = normalizeRegistry({ g: cfg });
	expect(missing.changed).toBe(false);
	expect(missing.value.g.paused_until).toBeNull();
	const valid = normalizeRegistry({ g: { ...cfg, paused_until: 123 } });
	expect(valid.changed).toBe(false);
	expect(valid.value.g.paused_until).toBe(123);
	for (const value of ["bad", NaN, Infinity]) {
		const invalid = normalizeRegistry({ g: { ...cfg, paused_until: value } });
		expect(invalid.changed).toBe(true);
		expect(invalid.value.g.paused_until).toBeNull();
	}
});
