import { afterEach, expect, setSystemTime, test } from "bun:test";
import { shouldDispatch } from "./dedup";

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
	const now = Date.now();
	setSystemTime(now);
	for (let i = 0; i < 501; i++) expect(shouldDispatch(`${prefix}-${i}`)).toBe(true);
	expect(shouldDispatch(`${prefix}-1`)).toBe(false);
	expect(shouldDispatch(`${prefix}-500`)).toBe(false);
	expect(shouldDispatch(`${prefix}-0`)).toBe(true);
	expect(shouldDispatch(`${prefix}-500`)).toBe(false);
	setSystemTime(now + 60_001);
	expect(shouldDispatch(`${prefix}-500`)).toBe(true);
});
