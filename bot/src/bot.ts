import {
	Client,
	Events,
	GatewayIntentBits,
	type Message,
	MessageFlags,
	type PartialMessage,
} from "discord.js";
import { handleInteraction } from "./commands/commands";
import { dispatchMedia, hasNewEmbedMedia } from "./media/dispatcher";
import { config } from "./utils/config";
import { logger } from "./utils/logger";

const log = logger.child({ module: "bot" });

// ─── Discord client ───────────────────────────────────────────────────────────

const discordClient = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
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
