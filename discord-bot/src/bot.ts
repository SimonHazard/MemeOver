import type { ServerWebSocket } from "bun";
import { Client, Events, GatewayIntentBits, Partials } from "discord.js";

import type { MemeMessage, MessageConnected } from "../types/message";

import { cleanupCommands, registerCommands } from "../utils/commands";
import { sendMessageToWebSocket } from "../utils/messages";

// WebSocket connections and user tracking
export const websocketConnectionsWithKey: Map<
	string,
	ServerWebSocket<unknown>
> = new Map();
export const usersByGuildId: Map<string, string[]> = new Map();

// Initialize Discord client
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Channel],
});

// Discord event handlers
client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;

	if (commandName === "join") {
		const command = interaction.options.get("id");
		const guildID = interaction.guildId;

		// Shouldn't happen but typing safety
		if (!command || !guildID) return;

		const code = command.value?.toString();

		// Shouldn't happen because the code is required but typing safety
		if (!code) {
			await interaction.reply({
				content: "You should enter a code",
			});
			return;
		}

		// Check if the code exists in the unpaired connections
		if (websocketConnectionsWithKey.has(code)) {
			// Add user to guild tracking
			if (!usersByGuildId.has(guildID)) {
				usersByGuildId.set(guildID, []);
			}

			const guildUsers = usersByGuildId.get(guildID) ?? [];

			guildUsers.push(code);
			usersByGuildId.set(guildID, guildUsers);

			// Send "isConnected" message to WebSocket
			const messageToSend: MessageConnected = {
				isConnected: true,
			};

			const wsConnection = websocketConnectionsWithKey.get(code);
			if (wsConnection) {
				wsConnection.send(JSON.stringify(messageToSend));
			}

			// Respond with a success message
			await interaction.reply({
				content:
					"You have successfully joined the session! You can now use `!send` command to send memes to your friends!",
			});
		} else {
			// Respond with an error message
			await interaction.reply({
				content: "Invalid code. Please check and try again...",
			});
		}
	} else if (commandName === "help") {
		await interaction.reply({
			content:
				"To join a session, you need to launch MemeOver app, then you'll have a code for the `/join` command. After that, `!send` in your message to send meme to your friends.",
		});
	}
});

client.on(Events.MessageCreate, async (message) => {
	// Ignore bot messages
	if (message.author.id === client.user?.id) return;

	// ATM slash command doesn't allow attachments
	// So we check if the message include !send
	if (!message.content.startsWith("!send")) return;

	const guildID = message.guildId;
	if (!guildID) return;

	// Check if there are paired connections for this guild
	const connections = usersByGuildId.get(guildID);
	if (!connections || connections.length === 0) return;

	let url = "";
	let isAnimated = false;
	let isAudio = false;

	// Check for attachments
	if (message.attachments.size > 0) {
		const attachment = message.attachments.first();
		if (attachment) {
			const contentType = attachment.contentType || "";
			url = attachment.url;

			if (contentType.includes("image")) {
				isAnimated = false;
				isAudio = false;
			} else if (contentType.includes("video")) {
				isAnimated = true;
				isAudio = false;
			} else if (contentType.includes("audio")) {
				isAnimated = false;
				isAudio = true;
			}
		}
	}

	// Check for embeds
	if (message.embeds.length > 0 && !url) {
		const embed = message.embeds[0];
		if (embed.image) {
			url = embed.url || "";
			isAnimated = false;
			isAudio = false;
		} else if (embed.video) {
			url = embed.url || "";
			isAnimated = true;
			isAudio = false;
		}
	}

	// Process message content
	let content = message.content;
	content = content.replace("!send", "").trim();

	// Remove links from the content
	content = content.replace(/https?:\/\/[^\s]+/g, "");

	// Prepare message to send
	const messageToSend: MemeMessage = {
		text: content,
		url: url,
		isAnimated: isAnimated,
		isAudio: isAudio,
	};

	// Send the message to each user in the paired connections
	for (const connection of connections) {
		sendMessageToWebSocket(connection, messageToSend);
	}
});

client.on(Events.ClientReady, async () => {
	await registerCommands();
});

client.on(Events.GuildCreate, async () => {
	await registerCommands();
});

// Start the Discord bot
async function main() {
	try {
		const discordToken = process.env.DISCORD_TOKEN;
		const applicationId = process.env.APPLICATION_ID;

		if (!discordToken) {
			throw new Error("DISCORD_TOKEN environment variable not set");
		}
		if (!applicationId) {
			throw new Error("APPLICATION_ID environment variable not set");
		}

		// Login to Discord
		await client.login(discordToken);
		console.log(`Logged in as ${client.user?.tag}`);

		// Handle shutdown
		process.on("SIGINT", async () => {
			console.log("Shutting down...");
			await cleanupCommands();
			client.destroy();
			process.exit(0);
		});
	} catch (error) {
		console.error("Error starting bot:", error);
		process.exit(1);
	}
}

main();
