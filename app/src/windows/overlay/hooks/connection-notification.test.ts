import { expect, test } from "bun:test";
import {
	type ConnectionTracker,
	INITIAL_CONNECTION_TRACKER,
	newlyConnectedCount,
} from "./connection-notification";

const at = (count: number): ConnectionTracker => ({ count });
const announce = (tracker: ConnectionTracker, count: number) =>
	newlyConnectedCount(tracker, count, true, "alive").announce;

test("initial snapshots, including after reconnect, do not announce existing users", () => {
	for (const count of [0, 1, 15]) {
		const result = newlyConnectedCount(INITIAL_CONNECTION_TRACKER, count, true, "alive");
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

test("a new arrival immediately after a departure is announced", () => {
	const left = newlyConnectedCount(at(3), 2, true, "alive");
	expect(left).toEqual({ tracker: at(2), announce: 0 });
	const joined = newlyConnectedCount(left.tracker, 3, true, "alive");
	expect(joined).toEqual({ tracker: at(3), announce: 1 });
	expect(announce(joined.tracker, 3)).toBe(0);
});

test("disabled notifications and hidden overlays suppress arrivals but keep tracking", () => {
	const disabled = newlyConnectedCount(at(1), 2, false, "alive");
	expect(disabled).toEqual({
		tracker: at(2),
		announce: 0,
	});
	expect(announce(disabled.tracker, 2)).toBe(0);
	const hidden = newlyConnectedCount(disabled.tracker, 3, true, "closed");
	expect(hidden).toEqual({ tracker: at(3), announce: 0 });
	expect(announce(hidden.tracker, 3)).toBe(0);
	expect(announce(hidden.tracker, 4)).toBe(1);
});
