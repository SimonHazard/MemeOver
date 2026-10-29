import { describe, expect, test } from "bun:test";
import type { WsStatus } from "./types";
import { decideStatusToast, INITIAL_TOAST_TRACKER } from "./ws-status-toasts";

function track(statuses: WsStatus[], revoked = false) {
	let tracker = INITIAL_TOAST_TRACKER;
	const toasts: string[] = [];
	for (const status of statuses) {
		const decision = decideStatusToast(tracker, status, revoked);
		tracker = decision.next;
		if (decision.toast) toasts.push(decision.toast);
	}
	return { tracker, toasts };
}

describe("settings WebSocket status toasts", () => {
	test("toasts once across repeated errors, disconnections and connection attempts", () => {
		expect(track(["error", "disconnected", "connecting", "error", "disconnected"]).toasts).toEqual([
			"error",
		]);
	});

	test("recovery clears the outage and permits one error for the next outage", () => {
		const recovered = track(["error", "disconnected", "connected"]);
		expect(recovered.toasts).toEqual(["error", "connected"]);
		expect(recovered.tracker.errorToasted).toBe(false);
		expect(decideStatusToast(recovered.tracker, "error", false).toast).toBe("error");
	});

	test("suppresses generic errors while revoked without consuming the outage toast", () => {
		const revoked = track(["error", "disconnected", "error"], true);
		expect(revoked.toasts).toEqual([]);
		expect(revoked.tracker.errorToasted).toBe(false);
		expect(decideStatusToast(revoked.tracker, "error", false).toast).toBe("error");
	});

	test("duplicate connected events only toast once", () => {
		expect(track(["connected", "connected"]).toasts).toEqual(["connected"]);
	});
});
