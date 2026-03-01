import { Client, Events, GatewayIntentBits, type Message, type PartialMessage } from "discord.js";
import { handleInteraction } from "./commands/commands";
import { dispatchMedia, hasNewEmbedMedia } from "./media/dispatcher";
import { config } from "./utils/config";

// ─── Discord client ───────────────────────────────────────────────────────────

const discordClient = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

discordClient.on(Events.ClientReady, (c) => {
	console.log(`[Bot] Logged in as ${c.user.tag}`);
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
	handleInteraction(interaction).catch((err: unknown) => {
		console.error("[Bot] Interaction handler error:", err);
	});
});

export async function startBot(): Promise<void> {
	await discordClient.login(config.discordToken);
}
