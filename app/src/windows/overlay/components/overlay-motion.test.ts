import { expect, test } from "bun:test";
import { BADGE_ENTER_DELAY_S, CAPTION_ENTER_DELAY_S, captionMotion } from "./overlay-motion";

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
