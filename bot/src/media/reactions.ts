import type { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { broadcastToGuild } from "../server";
import { canBroadcastReaction, canFetchReaction } from "../utils/reaction-rate-limit";
import { guildRegistry } from "../utils/registry";
import type { ReactionEvent } from "../utils/types";
import { admitGuildEvent } from "./admission";
import { classifyReactionSource, sourceField } from "./source";

export async function dispatchReaction(
	reaction: MessageReaction | PartialMessageReaction,
	user: User | PartialUser,
): Promise<void> {
	// Partial messages still carry their guild and channel ids from the gateway payload.
	const { guildId, channelId, id: messageId } = reaction.message;
	if (!guildId || !channelId) return;

	const source = classifyReactionSource(user);
	if (
		admitGuildEvent({
			channelAllowed: guildRegistry.isChannelAllowed(guildId, channelId),
			config: guildRegistry.getConfig(guildId),
			source,
			now: Date.now(),
			enforceSourcePolicy: true,
		}) !== "ok"
	)
		return;

	// Partials fire for messages older than the bot's cache. Fetching costs a REST call, so it
	// only happens once every in-memory gate has passed (most reactions come from unwatched guilds).
	if (reaction.partial) {
		if (!canFetchReaction(guildId)) return;
		try {
			await reaction.fetch();
		} catch {
			return;
		}
		// Guild settings may have changed while Discord was responding.
		if (
			admitGuildEvent({
				channelAllowed: guildRegistry.isChannelAllowed(guildId, channelId),
				config: guildRegistry.getConfig(guildId),
				source,
				now: Date.now(),
				enforceSourcePolicy: true,
			}) !== "ok"
		)
			return;
	}

	const emojiId = reaction.emoji.id;
	const emojiName = reaction.emoji.name;
	if (!emojiName && !emojiId) return;
	if (!canBroadcastReaction(guildId)) return;

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
