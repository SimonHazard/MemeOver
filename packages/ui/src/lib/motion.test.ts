import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { DURATION, EASE_DRAWER, EASE_IN_OUT, EASE_OUT, SPRING_MEDIA_POP } from "./motion";

test("CSS and JavaScript use the same easing curves", () => {
	const theme = readFileSync(new URL("../theme.css", import.meta.url), "utf8");
	for (const [name, curve] of [
		["out", EASE_OUT],
		["in-out", EASE_IN_OUT],
		["drawer", EASE_DRAWER],
	] as const) {
		const cssCurve = theme.match(new RegExp(`--ease-${name}:\\s*cubic-bezier\\(([^)]+)\\)`));
		expect(cssCurve?.[1].split(",").map(Number)).toEqual([...curve]);
	}
});

test("shared motion vocabulary", () => {
	for (const duration of Object.values(DURATION)) expect(duration).toBeLessThan(0.3);
	expect(DURATION.exit).toBeLessThan(DURATION.modal);
	expect(SPRING_MEDIA_POP).toEqual({ type: "spring", duration: 0.28, bounce: 0.2 });
});
