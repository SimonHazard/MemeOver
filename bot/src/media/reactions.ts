import type { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { broadcastToGuild } from "../server";
import { canBroadcastReaction } from "../utils/reaction-rate-limit";
import { guildRegistry } from "../utils/registry";
import type { ReactionEvent } from "../utils/types";
import { classifyReactionSource, sourceField } from "./source";

export async function dispatchReaction(
	reaction: MessageReaction | PartialMessageReaction,
	user: User | PartialUser,
): Promise<void> {
	// Partials fire for messages older than the bot's uptime; fetch hydrates `.message` / `.emoji`.
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch {
			return;
		}
	}

	const { guildId, channelId, id: messageId } = reaction.message;
	if (!guildId || !channelId) return;

	const source = classifyReactionSource(user);
	if (!guildRegistry.isChannelAllowed(guildId, channelId)) return;
	if (source === "bot_app" && !guildRegistry.getConfig(guildId)?.allow_bot_app_sources) return;
	if (!canBroadcastReaction(guildId)) return;

	const emojiId = reaction.emoji.id;
	const emojiName = reaction.emoji.name;
	if (!emojiName && !emojiId) return;

	const emoji_url =
		emojiId !== null
			? `https://cdn.discordapp.com/emojis/${emojiId}.${reaction.emoji.animated ? "gif" : "png"}?size=64&quality=lossless`
			: undefined;

	const event: ReactionEvent = {
		type: "REACTION",
		guild_id: guildId,
		channel_id: channelId,
		message_id: messageId,
		emoji: emojiName ?? "",
		emoji_url,
		user_id: user.id,
		timestamp: Date.now(),
		...sourceField(source),
	};
	broadcastToGuild(guildId, event);
}
