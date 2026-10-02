import { afterEach, expect, setSystemTime, test } from "bun:test";
import { canBroadcastReaction } from "./reaction-rate-limit";

afterEach(() => setSystemTime());
test("ten reactions per guild and fixed one-second window", () => {
	const id = crypto.randomUUID();
	const now = Date.now();
	setSystemTime(now);
	for (let i = 0; i < 10; i++) expect(canBroadcastReaction(id)).toBe(true);
	expect(canBroadcastReaction(id)).toBe(false);
	expect(canBroadcastReaction(`${id}-other`)).toBe(true);
	setSystemTime(now + 1000);
	expect(canBroadcastReaction(id)).toBe(true);
});
test("large bucket population remains usable after expiry", () => {
	// characterization: the sweep itself is not observable through this API.
	const id = crypto.randomUUID();
	const now = Date.now();
	setSystemTime(now);
	for (let i = 0; i < 300; i++) expect(canBroadcastReaction(`${id}-${i}`)).toBe(true);
	setSystemTime(now + 2001);
	expect(canBroadcastReaction(`${id}-0`)).toBe(true);
});
