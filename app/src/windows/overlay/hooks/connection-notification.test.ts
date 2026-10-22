import { expect, test } from "bun:test";
import { newlyConnectedCount } from "./connection-notification";

test("initial snapshots, including after reconnect, do not announce existing users", () => {
	for (const count of [0, 1, 15]) expect(newlyConnectedCount(null, count, true, "alive")).toBe(0);
});

test("only increases announce arrivals, including after a departure", () => {
	expect(newlyConnectedCount(2, 3, true, "alive")).toBe(1);
	expect(newlyConnectedCount(2, 5, true, "alive")).toBe(3);
	expect(newlyConnectedCount(2, 2, true, "alive")).toBe(0);
	expect(newlyConnectedCount(3, 2, true, "alive")).toBe(0);
	expect(newlyConnectedCount(0, 1, true, "alive")).toBe(1);
});

test("disabled notifications and hidden overlays suppress arrivals", () => {
	expect(newlyConnectedCount(1, 2, false, "alive")).toBe(0);
	expect(newlyConnectedCount(1, 2, true, "closed")).toBe(0);
});
