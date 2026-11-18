import type { SubscriptionResult } from "./helix";

export type TwitchStatus =
	| "disabled"
	| "signed_out"
	| "connecting"
	| "connected"
	| "reauth_required"
	| "error";

/** Every chat/moderation subscription is required; channel points may be unavailable. */
export function sessionOutcome(
	results: Record<string, SubscriptionResult>,
): "connected" | "unauthorized" | "error" {
	if (Object.values(results).includes("unauthorized")) return "unauthorized";
	return [
		"channel.chat.message",
		"channel.chat.notification",
		"channel.chat.message_delete",
		"channel.chat.clear_user_messages",
		"channel.chat.clear",
	].every((type) => results[type] === "created" || results[type] === "exists")
		? "connected"
		: "error";
}
