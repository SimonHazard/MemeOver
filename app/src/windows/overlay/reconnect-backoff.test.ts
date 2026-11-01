import { describe, expect, test } from "bun:test";
import { nextReconnectDelay, RECONNECT_BASE_MS, RECONNECT_MAX_MS } from "./reconnect-backoff";

describe("overlay reconnect backoff", () => {
	test("doubles from one second and caps the exponential delay", () => {
		expect(nextReconnectDelay(0, () => 0.5)).toBe(1_000);
		expect(nextReconnectDelay(3, () => 0.5)).toBe(8_000);
		expect(nextReconnectDelay(10, () => 0.5)).toBe(RECONNECT_MAX_MS);
		expect(nextReconnectDelay(1_024, () => 0.5)).toBe(RECONNECT_MAX_MS);
	});

	test("jitters by twenty percent even at the exponential cap", () => {
		expect(nextReconnectDelay(3, () => 0)).toBe(6_400);
		expect(nextReconnectDelay(3, () => 1)).toBe(9_600);
		expect(nextReconnectDelay(10, () => 0)).toBe(24_000);
		expect(nextReconnectDelay(10, () => 1)).toBe(36_000);
	});

	test("never schedules faster than the base delay", () => {
		for (const attempt of [-10, 0, 1, 10]) {
			expect(nextReconnectDelay(attempt, () => 0)).toBeGreaterThanOrEqual(RECONNECT_BASE_MS);
		}
	});
});
