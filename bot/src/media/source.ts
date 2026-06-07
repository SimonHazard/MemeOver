import type { EventSource } from "@memeover/shared";
import type { Message, PartialMessage, User } from "discord.js";

type MessageSourceInput = Pick<Message | PartialMessage, "applicationId" | "webhookId"> & {
	author?: Pick<User, "bot"> | null;
};
type ReactionSourceInput = Pick<User, "bot">;

export function sourceField(source: EventSource): { source?: EventSource } {
	return source === "bot_app" ? { source } : {};
}

export function classifyMessageSource(message: MessageSourceInput): EventSource {
	return message.author?.bot || message.applicationId !== null || message.webhookId !== null
		? "bot_app"
		: "user";
}

export function classifyReactionSource(user: ReactionSourceInput): EventSource {
	return user.bot ? "bot_app" : "user";
}
