import { expect, test } from "bun:test";
import { numberDirection } from "./animated-number-logic";

test("counter direction: increase, decrease and unchanged", () => {
	expect(numberDirection(1, 2)).toBe(1);
	expect(numberDirection(2, 1)).toBe(-1);
	expect(numberDirection(1, 1)).toBe(0);
});
