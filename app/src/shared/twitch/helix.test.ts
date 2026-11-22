import { expect, test } from "bun:test";
import { createSubscription, listRewards, subscriptionRequests } from "./helix";

function deps(response: Response, record?: (url: string, init?: RequestInit) => void) {
	return {
		clientId: "public-client",
		accessToken: "test-token",
		fetch: async function (this: unknown, url, init) {
			expect(this).toBeUndefined();
			record?.(String(url), init);
			return response;
		} as typeof fetch,
	};
}
test("subscription status mapping and exact authenticated request", async () => {
	for (const [status, outcome] of [
		[202, "created"],
		[409, "exists"],
		[401, "unauthorized"],
		[403, "forbidden"],
		[500, "failed"],
	] as const) {
		expect(
			await createSubscription(
				deps(new Response(null, { status }), (url, init) => {
					expect(url).toEndWith("/eventsub/subscriptions");
					expect(init?.method).toBe("POST");
					expect(init?.headers).toMatchObject({
						Authorization: "Bearer test-token",
						"Client-Id": "public-client",
					});
					expect(JSON.parse(String(init?.body))).toEqual({
						type: "channel.chat.message",
						version: "1",
						condition: { broadcaster_user_id: "123", user_id: "123" },
						transport: { method: "websocket", session_id: "session" },
					});
				}),
				{ ...subscriptionRequests("123")[0], sessionId: "session" },
			),
		).toBe(outcome);
	}
});
test("all six subscriptions use the streamer's identity", () => {
	const requests = subscriptionRequests("123");
	expect(requests).toHaveLength(6);
	for (const request of requests.slice(0, 5))
		expect(request.condition).toEqual({ broadcaster_user_id: "123", user_id: "123" });
	expect(requests[5].condition).toEqual({ broadcaster_user_id: "123" });
});
test("reward parsing filters invalid ids, bounds titles and reads input and availability from Twitch", async () => {
	const result = await listRewards(
		deps(
			Response.json({
				data: [
					{
						id: "reward-1",
						title: "A".repeat(100),
						is_user_input_required: true,
						is_enabled: true,
					},
					{ id: "bad/id", title: "bad", is_user_input_required: true, is_enabled: true },
					{ id: "reward-2", title: "No input", is_user_input_required: false, is_enabled: true },
					{ id: "reward-3", title: "Disabled", is_user_input_required: true, is_enabled: false },
				],
			}),
			(url, init) => {
				expect(url).toEndWith("/custom_rewards?broadcaster_id=123");
				expect(init?.method ?? "GET").toBe("GET");
				expect(init?.signal).toBeInstanceOf(AbortSignal);
			},
		),
		"123",
	);
	expect(result).toEqual({
		status: "ok",
		rewards: [
			{ id: "reward-1", title: "A".repeat(80), needsInput: true, enabled: true },
			{ id: "reward-2", title: "No input", needsInput: false, enabled: true },
			{ id: "reward-3", title: "Disabled", needsInput: true, enabled: false },
		],
	});
});
test("reward failures do not expose response bodies", async () => {
	for (const [status, outcome] of [
		[403, "unavailable"],
		[401, "unauthorized"],
		[500, "failed"],
	] as const)
		expect(await listRewards(deps(new Response("private", { status })), "123")).toEqual({
			status: outcome,
		});
	for (const response of [
		new Response("not json"),
		Response.json({}),
		Response.json({ data: "bad" }),
	])
		expect(await listRewards(deps(response), "123")).toEqual({ status: "failed" });
});
