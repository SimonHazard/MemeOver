import { expect, test } from "bun:test";
import { type SubscriptionResult, subscriptionRequests } from "./helix";
import { sessionOutcome } from "./status";

test("every chat subscription is required, redemption alone may fail", () => {
	const success: Record<string, SubscriptionResult> = Object.fromEntries(
		subscriptionRequests("123").map(({ type }) => [type, "created"]),
	);
	expect(sessionOutcome(success)).toBe("connected");
	for (const outcome of ["forbidden", "failed"] as const) {
		expect(
			sessionOutcome({
				...success,
				"channel.channel_points_custom_reward_redemption.add": outcome,
			}),
		).toBe("connected");
		for (const { type } of subscriptionRequests("123").slice(0, 5))
			expect(sessionOutcome({ ...success, [type]: outcome })).toBe("error");
	}
	for (const { type } of subscriptionRequests("123"))
		expect(sessionOutcome({ ...success, [type]: "unauthorized" })).toBe("unauthorized");
	expect(sessionOutcome({})).toBe("error");
	expect(sessionOutcome({ ...success, "channel.chat.message": "exists" })).toBe("connected");
});
