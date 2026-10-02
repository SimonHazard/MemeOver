import { expect, test } from "bun:test";
import type { OverlayPosition } from "@/shared/types";
import {
	BADGE_ENTER_DELAY_S,
	CAPTION_ENTER_DELAY_S,
	captionMotion,
	transformOriginFor,
} from "./overlay-motion";

test("all nine anchored origins", () => {
	const expected: Record<OverlayPosition, string> = {
		center: "50% 50%",
		"top-left": "0% 0%",
		top: "50% 0%",
		"top-right": "100% 0%",
		left: "0% 50%",
		right: "100% 50%",
		"bottom-left": "0% 100%",
		bottom: "50% 100%",
		"bottom-right": "100% 100%",
	};
	for (const position of Object.keys(expected) as OverlayPosition[])
		expect(transformOriginFor(position)).toBe(expected[position]);
});
test("center preserves historical origin", () =>
	expect(transformOriginFor("center")).toBe("50% 50%"));
test("caption follows badge and reduced motion has no spatial movement or delay", () => {
	expect(CAPTION_ENTER_DELAY_S).toBeGreaterThan(BADGE_ENTER_DELAY_S);
	const normal = captionMotion(false);
	expect(normal.initial).toMatchObject({ transform: "translateY(4px)" });
	expect(normal.transition).toMatchObject({ delay: 0.15, duration: 0.2 });
	const reduced = captionMotion(true);
	expect(reduced.initial).toEqual({ opacity: 0 });
	expect(reduced.animate).toEqual({ opacity: 1 });
	expect(reduced.transition).not.toHaveProperty("delay");
	expect(reduced.transition.duration).toBe(0.12);
});
