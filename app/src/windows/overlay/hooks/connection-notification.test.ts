import { expect, test } from "bun:test";
import {
	type ConnectionTracker,
	INITIAL_CONNECTION_TRACKER,
	newlyConnectedCount,
	RECONNECT_GRACE_MS,
} from "./connection-notification";

const at = (count: number, departures: number[] = []): ConnectionTracker => ({ count, departures });
const announce = (tracker: ConnectionTracker, count: number, now = 0) =>
	newlyConnectedCount(tracker, count, now, true, "alive").announce;

test("initial snapshots, including after reconnect, do not announce existing users", () => {
	for (const count of [0, 1, 15]) {
		const result = newlyConnectedCount(INITIAL_CONNECTION_TRACKER, count, 0, true, "alive");
		expect(result).toEqual({ tracker: at(count), announce: 0 });
	}
});

test("only increases announce arrivals", () => {
	expect(announce(at(2), 3)).toBe(1);
	expect(announce(at(2), 5)).toBe(3);
	expect(announce(at(2), 2)).toBe(0);
	expect(announce(at(3), 2)).toBe(0);
	expect(announce(at(0), 1)).toBe(1);
});

test("a peer reconnecting within the grace window is not announced", () => {
	const left = newlyConnectedCount(at(3), 2, 1_000, true, "alive");
	expect(left.tracker.departures).toEqual([1_000 + RECONNECT_GRACE_MS]);
	const back = newlyConnectedCount(left.tracker, 3, 4_000, true, "alive");
	expect(back).toEqual({ tracker: at(3), announce: 0 });
	expect(announce(back.tracker, 4, 5_000)).toBe(1);
});

test("departures absorb only as many arrivals as left, and expire", () => {
	expect(announce(at(1, [10_000, 10_000]), 4, 5_000)).toBe(1);
	expect(announce(at(2, [10_000]), 3, 10_000)).toBe(1);
});

test("disabled notifications and hidden overlays suppress arrivals but keep tracking", () => {
	expect(newlyConnectedCount(at(1), 2, 0, false, "alive")).toEqual({
		tracker: at(2),
		announce: 0,
	});
	expect(newlyConnectedCount(at(1), 2, 0, true, "closed").announce).toBe(0);
	const left = newlyConnectedCount(at(2), 1, 0, false, "alive").tracker;
	expect(announce(left, 2, 1_000)).toBe(0);
});
