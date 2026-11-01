import {
	Client,
	Events,
	GatewayCloseCodes,
	GatewayIntentBits,
	type Message,
	Options,
	type PartialMessage,
	Partials,
} from "discord.js";
import { handleInteraction } from "./commands/commands";
import { errorResponse } from "./commands/response-panel";
import { interactionLocale, t } from "./i18n";
import { dispatchMedia, isEmbedResolutionUpdate } from "./media/dispatcher";
import { dispatchReaction } from "./media/reactions";
import { startGuildCleanupScheduler, unregisterRemovedGuild } from "./utils/cleanup";
import { config } from "./utils/config";
import { markShardLost, markShardReady } from "./utils/discord-gateway";
import {
	DISCORD_MESSAGE_CONTENT_INTENT_ERROR,
	normalizeBotLoginError,
} from "./utils/discord-intents";
import { discordRefLogFields } from "./utils/log-privacy";
import { logger } from "./utils/logger";
import { attachPresenceClient } from "./utils/presence";

const log = logger.child({ module: "bot" });

// ─── Discord client ───────────────────────────────────────────────────────────

const discordClient = new Client({
	allowedMentions: { parse: [] },
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions,
	],
	// Required so we receive reactionAdd for messages that aren't in the cache
	// (e.g. anything older than the bot's current uptime).
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
	// The bot reads every message of every guild it is in, but only needs one on create and for
	// the few seconds before Discord resolves its Tenor/Giphy embeds. The default (200 messages
	// per channel, never swept) grows with uptime and guild count.
	makeCache: Options.cacheWithLimits({
		...Options.DefaultMakeCacheSettings,
		MessageManager: 25,
	}),
	sweepers: {
		...Options.DefaultSweeperSettings,
		messages: { interval: 5 * 60, lifetime: 30 * 60 },
	},
});

discordClient.on(Events.ClientReady, (c) => {
	log.info({ event: "ready", tag: c.user.tag }, `Logged in as ${c.user.tag}`);
	attachPresenceClient(c);
	startGuildCleanupScheduler(c);
});

// discord.js emits GuildUnavailable for outages and GuildDelete for actual removal.
discordClient.on(Events.GuildDelete, (guild) => {
	unregisterRemovedGuild(guild.id);
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
		if (isEmbedResolutionUpdate(oldMessage, newMessage)) {
			dispatchMedia(newMessage, false);
		}
	},
);

discordClient.on(Events.MessageReactionAdd, (reaction, user) => {
	dispatchReaction(reaction, user).catch((err: unknown) => {
		log.error(
			{
				event: "reaction_dispatch_failed",
				err,
				...discordRefLogFields({
					guildId: reaction.message.guildId,
					channelId: reaction.message.channelId,
					messageId: reaction.message.id,
				}),
			},
			"Reaction dispatch failed",
		);
	});
});

discordClient.on(Events.Error, (err) => {
	log.error({ event: "client_error", err }, "Discord client error");
});
discordClient.on(Events.Warn, (warning) => {
	log.warn({ event: "client_warning", warning }, "Discord client warning");
});
discordClient.on(Events.ShardError, (err, shardId) => {
	log.warn({ event: "shard_error", err, shard_id: shardId }, "Discord shard error");
});
// discord.js emits ShardDisconnect only for close codes it will not recover from (token,
// intents, sharding); ordinary drops go through ShardReconnecting. /health reports it.
discordClient.on(Events.ShardDisconnect, (close, shardId) => {
	markShardLost(shardId, close.code);
	log.error(
		{ event: "shard_disconnect", shard_id: shardId, close_code: close.code },
		close.code === GatewayCloseCodes.DisallowedIntents
			? DISCORD_MESSAGE_CONTENT_INTENT_ERROR
			: "Discord closed the gateway permanently; fix the bot token or intents, then restart",
	);
});
discordClient.on(Events.ShardReady, (shardId) => {
	markShardReady(shardId);
});

// Slash commands
discordClient.on(Events.InteractionCreate, (interaction) => {
	handleInteraction(interaction).catch(async (err: unknown) => {
		log.error({ event: "interaction_error", err }, "Interaction handler error");
		if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
			try {
				await interaction.reply(
					errorResponse(t(interactionLocale(interaction), "bot.genericError")),
				);
			} catch {
				// Interaction may have expired — ignore
			}
		}
	});
});

export async function startBot(): Promise<void> {
	try {
		await discordClient.login(config.discordToken);
	} catch (err) {
		throw normalizeBotLoginError(err);
	}
}

export async function destroyDiscordClient(): Promise<void> {
	await discordClient.destroy();
}
