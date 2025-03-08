import { randomBytes } from "node:crypto";
import type * as http from "node:http";

import {
	ApplicationCommandOptionType,
	Client,
	Events,
	GatewayIntentBits,
	Partials,
	REST,
	Routes,
} from "discord.js";

import type {
	MemeMessage,
	MessageCode,
	MessageConnected,
} from "../types/message";

// Command options
const dmPermission = false;
const removeCommands = true;

// Command definitions
const commands = [
	{
		name: "join",
		description: "This command permits to join a MemeOver session",
		dm_permission: dmPermission,
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "id",
				description: "Unique ID",
				required: true,
			},
		],
	},
	{
		name: "help",
		description: "How to use MemeOver?",
	},
];

// WebSocket connections and user tracking
const websocketConnectionsWithKey: Map<string, WebSocket> = new Map();
const usersByGuildId: Map<string, string[]> = new Map();

// Initialize Discord client
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.Channel],
});

// Generate unique ID
function generateUniqueID(): string {
	const charset =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const length = 6;
	let result = "";

	const randomBytesBuffer = randomBytes(length);
	for (let i = 0; i < length; i++) {
		const randomIndex = randomBytesBuffer[i] % charset.length;
		result += charset[randomIndex];
	}

	return result;
}

// Ensure ID is unique
function getUniqueID(): string {
	while (true) {
		const id = generateUniqueID();
		if (!websocketConnectionsWithKey.has(id)) {
			return id;
		}
	}
}

// Remove connection from usersByGuildId
function removeFromUsersByGuildId(connectionKey: string): void {
	for (const [guildID, connections] of usersByGuildId.entries()) {
		const index = connections.indexOf(connectionKey);
		if (index !== -1) {
			connections.splice(index, 1);
			usersByGuildId.set(guildID, connections);
			break;
		}
	}
}

// Send message to WebSocket
function sendMessageToWebSocket(
	connection: string,
	message: MemeMessage,
): void {
	const websocketConnection = websocketConnectionsWithKey.get(connection);
	if (websocketConnection) {
		try {
			const messageJSON = JSON.stringify(message);
			websocketConnection.send(messageJSON);
		} catch (err) {
			console.log("Error sending message:", err);
		}
	}
}

// Register commands with Discord API
async function registerCommands(): Promise<void> {
	const discordToken = process.env.DISCORD_TOKEN;
	const applicationId = process.env.APPLICATION_ID;

	if (!discordToken || !applicationId) {
		throw new Error(
			"Missing DISCORD_TOKEN or APPLICATION_ID environment variables",
		);
	}

	const rest = new REST({ version: "10" }).setToken(discordToken);

	try {
		console.log("Started refreshing application (/) commands.");

		await rest.put(Routes.applicationCommands(applicationId), {
			body: commands,
		});

		console.log("Successfully reloaded application (/) commands.");
	} catch (error) {
		console.error("Error registering commands:", error);
	}
}

// Clean up commands
async function cleanupCommands(): Promise<void> {
	if (!removeCommands) return;

	const discordToken = process.env.DISCORD_TOKEN;
	const applicationId = process.env.APPLICATION_ID;

	if (!discordToken || !applicationId) {
		throw new Error(
			"Missing DISCORD_TOKEN or APPLICATION_ID environment variables",
		);
	}

	const rest = new REST().setToken(discordToken);

	try {
		console.log("Removing commands...");
		await rest.put(Routes.applicationCommands(applicationId), { body: [] });
		console.log("Successfully removed application commands.");
	} catch (error) {
		console.error("Error removing commands:", error);
	}
}

// Handle WebSocket connections
function handleConnections(req: http.IncomingMessage, socket: WebSocket): void {
	console.log("WebSocket connection established", new Date());

	const uniqueID = getUniqueID();
	websocketConnectionsWithKey.set(uniqueID, socket);

	// Send unique code to client
	const messageToSend: MessageCode = {
		code: uniqueID,
	};

	socket.send(JSON.stringify(messageToSend));

	// Set up message handling
	socket.on("message", (message) => {
		const messageStr = message.toString();

		if (messageStr === "ping") {
			socket.send("pong");
			return;
		}

		try {
			JSON.parse(messageStr);
		} catch (err) {
			console.log("Invalid JSON message:", err);
		}
	});

	// Handle disconnection
	socket.on("close", () => {
		console.log("WebSocket connection closed");

		for (const [key, conn] of websocketConnectionsWithKey.entries()) {
			if (conn === socket) {
				websocketConnectionsWithKey.delete(key);
				removeFromUsersByGuildId(key);
				console.log("Closed key", key);
				break;
			}
		}
	});
}

// Discord event handlers
client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;

	if (commandName === "join") {
		const code = interaction.options.getMember("id")?.toString() || "";
		const guildID = interaction.guildId || "";

		// Check if the code exists in the unpaired connections
		if (websocketConnectionsWithKey.has(code)) {
			// Add user to guild tracking
			if (!usersByGuildId.has(guildID)) {
				usersByGuildId.set(guildID, []);
			}
			const guildUsers = usersByGuildId.get(guildID) || [];
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
				content: "Invalid code. Please check and try again.",
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

		// Register commands
		await registerCommands();

		// Handle shutdown
		process.on("SIGINT", async () => {
			console.log("Shutting down...");
			await cleanupCommands();
			client.destroy();
			// wss.close();
			process.exit(0);
		});
	} catch (error) {
		console.error("Error starting bot:", error);
		process.exit(1);
	}
}

main();
