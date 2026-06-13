import {
	Client,
	Events,
	GatewayIntentBits,
	type Message,
	type PartialMessage,
	Partials,
} from "discord.js";
import { handleInteraction } from "./commands/commands";
import { errorResponse } from "./commands/response-panel";
import { interactionLocale, t } from "./i18n";
import { dispatchMedia, hasNewEmbedMedia } from "./media/dispatcher";
import { dispatchReaction } from "./media/reactions";
import { startGuildCleanupScheduler } from "./utils/cleanup";
import { config } from "./utils/config";
import { normalizeBotLoginError } from "./utils/discord-intents";
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
});

discordClient.on(Events.ClientReady, (c) => {
	log.info({ event: "ready", tag: c.user.tag }, `Logged in as ${c.user.tag}`);
	attachPresenceClient(c);
	startGuildCleanupScheduler(c);
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
	await dispatchReaction(reaction, user);
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
