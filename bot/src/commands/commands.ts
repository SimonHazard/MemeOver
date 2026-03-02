import {
	type Interaction,
	MessageFlags,
	PermissionFlagsBits,
	REST,
	Routes,
	SlashCommandBuilder,
} from "discord.js";

import { config } from "../utils/config";

import { handleRemove } from "./subcommands/remove";
import { handleSetup } from "./subcommands/setup";
import { handleToken } from "./subcommands/token";

// ─── Command definitions ──────────────────────────────────────────────────────

const memeover = new SlashCommandBuilder()
	.setName("memeover")
	.setDescription("Manage MemeOver for this server")
	.addSubcommand((sub) =>
		sub
			.setName("setup")
			.setDescription(
				"Register this server. Omit #channel to watch all channels; specify one to add it to the list.",
			)
			.addChannelOption((opt) =>
				opt
					.setName("channel")
					.setDescription("Add a specific channel to watch (omit to watch all channels)")
					.setRequired(false),
			),
	)
	.addSubcommand((sub) =>
		sub.setName("token").setDescription("Show your connection credentials (only visible to you)"),
	)
	.addSubcommand((sub) =>
		sub.setName("remove").setDescription("Unregister this server from MemeOver"),
	);

// ─── Command registration ─────────────────────────────────────────────────────

export async function registerCommands(): Promise<void> {
	const rest = new REST().setToken(config.discordToken);
	await rest.put(Routes.applicationCommands(config.discordClientId), {
		body: [memeover.toJSON()],
	});
	console.log("[Commands] Slash commands registered globally");
}

// ─── Interaction handler ──────────────────────────────────────────────────────

export async function handleInteraction(interaction: Interaction): Promise<void> {
	if (!interaction.isChatInputCommand()) return;
	if (interaction.commandName !== "memeover") return;

	const guildId = interaction.guildId;
	if (!guildId) {
		await interaction.reply({
			content: "This command can only be used in a server.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const sub = interaction.options.getSubcommand();

	// setup and remove require Manage Server permission; token is open to all members
	if (sub === "setup" || sub === "remove") {
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
			await interaction.reply({
				content: "❌ You need the **Manage Server** permission to use this command.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
	}

	if (sub === "setup") {
		await handleSetup(interaction, guildId);
	} else if (sub === "token") {
		await handleToken(interaction, guildId);
	} else if (sub === "remove") {
		await handleRemove(interaction, guildId);
	}
}
