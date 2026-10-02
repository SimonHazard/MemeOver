import { describe, expect, test } from "bun:test";
import { fallbackAvatarColor } from "./author-badge";

describe("fallbackAvatarColor", () => {
	test("is stable for the same author", () => {
		expect(fallbackAvatarColor("123456789012345678")).toBe(
			fallbackAvatarColor("123456789012345678"),
		);
	});

	test("always returns a colour from the Discord palette", () => {
		const palette = new Set(["#5865F2", "#757E8A", "#3BA55C", "#FAA61A", "#ED4245", "#EB459F"]);
		for (const id of ["", "secret", "1", "123456789012345678", "999999999999999999999"]) {
			expect(palette.has(fallbackAvatarColor(id))).toBe(true);
		}
	});

	test("spreads different authors across the palette", () => {
		const ids = Array.from({ length: 60 }, (_, i) => `1000000000000000${i}`);
		expect(new Set(ids.map(fallbackAvatarColor)).size).toBeGreaterThan(3);
	});
});
