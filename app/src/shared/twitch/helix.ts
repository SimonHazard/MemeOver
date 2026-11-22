import { z } from "zod";
import { TWITCH_API_BASE } from "./config";

export type SubscriptionResult = "created" | "exists" | "unauthorized" | "forbidden" | "failed";
export interface HelixDependencies {
	fetch: typeof fetch;
	clientId: string;
	accessToken: string;
	signal?: AbortSignal;
}

export interface SubscriptionRequest {
	type: string;
	condition: Record<string, string>;
}
export interface TwitchReward {
	id: string;
	title: string;
	needsInput: boolean;
}
export type RewardsResult =
	| { status: "ok"; rewards: TwitchReward[] }
	| { status: "unavailable" | "unauthorized" | "failed" };

function headers(deps: HelixDependencies): Record<string, string> {
	return { Authorization: `Bearer ${deps.accessToken}`, "Client-Id": deps.clientId };
}

export async function createSubscription(
	deps: HelixDependencies,
	request: SubscriptionRequest & { sessionId: string },
): Promise<SubscriptionResult> {
	const fetchRequest = deps.fetch;
	const response = await fetchRequest(`${TWITCH_API_BASE}/eventsub/subscriptions`, {
		method: "POST",
		headers: { ...headers(deps), "Content-Type": "application/json" },
		signal: deps.signal,
		body: JSON.stringify({
			type: request.type,
			version: "1",
			condition: request.condition,
			transport: { method: "websocket", session_id: request.sessionId },
		}),
	});
	switch (response.status) {
		case 202:
			return "created";
		case 409:
			return "exists";
		case 401:
			return "unauthorized";
		case 403:
			return "forbidden";
		default:
			return "failed";
	}
}

export function subscriptionRequests(broadcasterId: string): SubscriptionRequest[] {
	return [
		...[
			"channel.chat.message",
			"channel.chat.notification",
			"channel.chat.message_delete",
			"channel.chat.clear_user_messages",
			"channel.chat.clear",
		].map((type) => ({
			type,
			condition: { broadcaster_user_id: broadcasterId, user_id: broadcasterId },
		})),
		{
			type: "channel.channel_points_custom_reward_redemption.add",
			condition: { broadcaster_user_id: broadcasterId },
		},
	];
}

const rewardSchema = z.object({
	id: z.string().regex(/^[A-Za-z0-9-]{1,64}$/),
	title: z.string().transform((value) => value.slice(0, 80)),
	is_user_input_required: z.boolean(),
});
const rewardsSchema = z.object({ data: z.array(z.unknown()) });

export async function listRewards(
	deps: HelixDependencies,
	broadcasterId: string,
): Promise<RewardsResult> {
	const fetchRequest = deps.fetch;
	const response = await fetchRequest(
		`${TWITCH_API_BASE}/channel_points/custom_rewards?${new URLSearchParams({ broadcaster_id: broadcasterId })}`,
		{ headers: headers(deps), signal: deps.signal },
	);
	if (response.status === 403) return { status: "unavailable" };
	if (response.status === 401) return { status: "unauthorized" };
	if (!response.ok) return { status: "failed" };
	let value: unknown;
	try {
		value = await response.json();
	} catch {
		return { status: "failed" };
	}
	const parsed = rewardsSchema.safeParse(value);
	if (!parsed.success) return { status: "failed" };
	return {
		status: "ok",
		rewards: parsed.data.data.flatMap((value) => {
			const reward = rewardSchema.safeParse(value);
			return reward.success
				? [
						{
							id: reward.data.id,
							title: reward.data.title,
							needsInput: reward.data.is_user_input_required,
						},
					]
				: [];
		}),
	};
}
