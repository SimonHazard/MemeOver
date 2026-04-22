import {
	Client,
	Events,
	GatewayIntentBits,
	type Message,
	MessageFlags,
	type PartialMessage,
	Partials,
} from "discord.js";
import { handleInteraction } from "./commands/commands";
import { dispatchMedia, hasNewEmbedMedia } from "./media/dispatcher";
import { broadcastToGuild } from "./server";
import { config } from "./utils/config";
import { logger } from "./utils/logger";
import { canBroadcastReaction } from "./utils/reaction-rate-limit";
import { guildRegistry } from "./utils/registry";
import type { ReactionEvent } from "./utils/types";

const log = logger.child({ module: "bot" });

// ─── Discord client ───────────────────────────────────────────────────────────

const discordClient = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions,
	],
	// Required so we receive reactionAdd for messages that aren't in the cache
	// (e.g. anything older than the bot's current uptime).
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

discordClient.on(Events.ClientReady, (c) => {
	log.info({ event: "ready", tag: c.user.tag }, `Logged in as ${c.user.tag}`);
});

// New messages — include text caption
discordClient.on(Events.MessageCreate, (message: Message) => {
	dispatchMedia(message, true);
});

// Updated messages — catches Tenor/Giphy GIFs that arrive as embeds after post.
// Do NOT include text: it was already sent with the messageCreate event.
discordClient.on(
	Events.MessageUpdate,
	(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage) => {
		const hadEmbeds = oldMessage.embeds.length > 0;
		const hasEmbeds = newMessage.embeds.length > 0;
		if (!hadEmbeds && hasEmbeds && hasNewEmbedMedia(newMessage)) {
			dispatchMedia(newMessage, false);
		}
	},
);

discordClient.on(Events.MessageReactionAdd, async (reaction, user) => {
	// Partials fire for messages older than the bot's uptime; fetch hydrates `.message` / `.emoji`.
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch {
			return;
		}
	}
	if (user.bot) return;

	const { guildId, channelId, id: messageId } = reaction.message;
	if (!guildId || !channelId) return;

	if (!guildRegistry.isChannelAllowed(guildId, channelId)) return;
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
	};
	broadcastToGuild(guildId, event);
});

// Slash commands
discordClient.on(Events.InteractionCreate, (interaction) => {
	handleInteraction(interaction).catch(async (err: unknown) => {
		log.error({ event: "interaction_error", err }, "Interaction handler error");
		if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
			try {
				await interaction.reply({ content: "An error occurred.", flags: MessageFlags.Ephemeral });
			} catch {
				// Interaction may have expired — ignore
			}
		}
	});
});

export async function startBot(): Promise<void> {
	await discordClient.login(config.discordToken);
}
