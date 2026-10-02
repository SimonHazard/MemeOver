import { expect, test } from "bun:test";
import { DURATION, EASE_OUT, SPRING_MEDIA_POP } from "./motion";

test("shared motion vocabulary", () => {
	expect(EASE_OUT).toEqual([0.23, 1, 0.32, 1]);
	for (const duration of Object.values(DURATION)) expect(duration).toBeLessThan(0.3);
	expect(DURATION.exit).toBeLessThan(DURATION.modal);
	expect(SPRING_MEDIA_POP).toEqual({ type: "spring", duration: 0.28, bounce: 0.2 });
});
