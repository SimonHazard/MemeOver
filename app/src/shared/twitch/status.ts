import type { SubscriptionResult } from "./helix";

export type TwitchStatus =
	| "disabled"
	| "signed_out"
	| "connecting"
	| "connected"
	| "chat_only"
	| "reauth_required"
	| "error";

/** Every chat/moderation subscription is required; channel points may be unavailable. */
export function sessionOutcome(
	results: Record<string, SubscriptionResult>,
): "connected" | "chat_only" | "unauthorized" | "error" {
	if (Object.values(results).includes("unauthorized")) return "unauthorized";
	const chatReady = [
		"channel.chat.message",
		"channel.chat.notification",
		"channel.chat.message_delete",
		"channel.chat.clear_user_messages",
		"channel.chat.clear",
	].every((type) => results[type] === "created" || results[type] === "exists");
	if (!chatReady) return "error";
	const reward = results["channel.channel_points_custom_reward_redemption.add"];
	return reward === "created" || reward === "exists" ? "connected" : "chat_only";
}
