import { afterEach, expect, setSystemTime, test } from "bun:test";
import { dedupSize, shouldDispatch } from "./dedup";

afterEach(() => setSystemTime());
test("dedup TTL", () => {
	const key = crypto.randomUUID();
	const now = Date.now();
	setSystemTime(now);
	expect(shouldDispatch(key)).toBe(true);
	expect(shouldDispatch(key)).toBe(false);
	setSystemTime(now + 60001);
	expect(shouldDispatch(key)).toBe(true);
});
test("dedup evicts oldest entries beyond 500", () => {
	const prefix = crypto.randomUUID();
	for (let i = 0; i < 501; i++) expect(shouldDispatch(`${prefix}-${i}`)).toBe(true);
	expect(dedupSize()).toBeLessThanOrEqual(500);
	expect(shouldDispatch(`${prefix}-0`)).toBe(true);
});
