import { expect, test } from "bun:test";
import { nextHoldState } from "./hold-to-confirm-logic";

test("quick release cancels; repeats cannot start or restart a hold", () => {
	expect(nextHoldState("idle", { type: "start", repeat: true })).toBe("idle");
	expect(nextHoldState("holding", { type: "start", repeat: true })).toBe("holding");
	expect(nextHoldState("holding", { type: "cancel" })).toBe("idle");
	expect(nextHoldState("idle", { type: "complete" })).toBe("idle");
});
test("completion confirms once until released", () => {
	expect(nextHoldState("idle", { type: "start" })).toBe("holding");
	expect(nextHoldState("holding", { type: "complete" })).toBe("confirmed");
	expect(nextHoldState("confirmed", { type: "complete" })).toBe("confirmed");
	expect(nextHoldState("confirmed", { type: "start" })).toBe("confirmed");
	expect(nextHoldState("confirmed", { type: "cancel" })).toBe("idle");
});
