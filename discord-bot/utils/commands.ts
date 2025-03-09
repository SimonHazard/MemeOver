import {
	InteractionContextType,
	REST,
	Routes,
	SlashCommandBuilder,
	SlashCommandStringOption,
} from "discord.js";

// Command definitions
export const slashCommands = [
	new SlashCommandBuilder()
		.setName("join")
		.setDescription("Join a MemeOver session")
		.setContexts([InteractionContextType.Guild])
		.addStringOption(
			new SlashCommandStringOption()
				.setName("id")
				.setDescription("Unique ID")
				.setRequired(true),
		),
	new SlashCommandBuilder()
		.setName("help")
		.setDescription("How to use MemeOver?"),
].map((command) => command.toJSON());

// Clean up commands
export async function cleanupCommands(): Promise<void> {
	const discordToken = process.env.DISCORD_TOKEN;
	const applicationId = process.env.APPLICATION_ID;

	if (!discordToken || !applicationId) {
		throw new Error(
			"Missing DISCORD_TOKEN or APPLICATION_ID environment variables",
		);
	}

	const rest = new REST({ version: "10" }).setToken(discordToken);

	try {
		console.log("Removing commands...");
		await rest.put(Routes.applicationCommands(applicationId), { body: [] });
		console.log("Commands removed");
	} catch (error) {
		console.error("Error removing commands:", error);
	}
}

// Register commands with Discord API
export async function registerCommands(): Promise<void> {
	const discordToken = process.env.DISCORD_TOKEN;
	const applicationId = process.env.APPLICATION_ID;

	if (!discordToken || !applicationId) {
		throw new Error(
			"Missing DISCORD_TOKEN or APPLICATION_ID environment variables",
		);
	}

	const rest = new REST({ version: "10" }).setToken(discordToken);

	try {
		console.log("Adding commands...");
		await rest.put(Routes.applicationCommands(applicationId), {
			body: slashCommands,
		});
		console.log("Commands added");
	} catch (error) {
		console.error("Error registering commands:", error);
	}
}
