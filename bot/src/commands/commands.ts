import {
	type Interaction,
	MessageFlags,
	PermissionFlagsBits,
	REST,
	Routes,
	SlashCommandBuilder,
} from "discord.js";

import { config } from "../utils/config";
import { logger } from "../utils/logger";

import { errorEmbed } from "./embeds";
import { handleHelp } from "./subcommands/help";
import { handleRemove } from "./subcommands/remove";
import { handleRotate } from "./subcommands/rotate";
import { handleSetup } from "./subcommands/setup";
import { handleStatus } from "./subcommands/status";
import { handleToken } from "./subcommands/token";

const log = logger.child({ module: "commands" });

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
		sub
			.setName("rotate")
			.setDescription("Generate a new connection token, invalidating the current one"),
	)
	.addSubcommand((sub) =>
		sub.setName("remove").setDescription("Unregister this server from MemeOver"),
	)
	.addSubcommand((sub) =>
		sub.setName("status").setDescription("Show bot configuration, watched channels, and uptime"),
	)
	.addSubcommand((sub) =>
		sub.setName("help").setDescription("List all MemeOver commands and what they do"),
	);

// Subcommands that require the Manage Server permission. `token` and `help`
// are deliberately open to all members.
const PRIVILEGED_SUBS = new Set(["setup", "remove", "rotate", "status"]);

// ─── Command registration ─────────────────────────────────────────────────────

export async function registerCommands(): Promise<void> {
	const rest = new REST().setToken(config.discordToken);
	await rest.put(Routes.applicationCommands(config.discordClientId), {
		body: [memeover.toJSON()],
	});
	log.info({ event: "commands_registered" }, "Slash commands registered globally");
}

// ─── Interaction handler ──────────────────────────────────────────────────────

export async function handleInteraction(interaction: Interaction): Promise<void> {
	if (!interaction.isChatInputCommand()) return;
	if (interaction.commandName !== "memeover") return;

	const guildId = interaction.guildId;
	if (!guildId) {
		await interaction.reply({
			embeds: [errorEmbed("Server only", "This command can only be used in a server.")],
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const sub = interaction.options.getSubcommand();

	if (PRIVILEGED_SUBS.has(sub)) {
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
			await interaction.reply({
				embeds: [
					errorEmbed(
						"Permission denied",
						"You need the **Manage Server** permission to use this command.",
					),
				],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
	}

	if (sub === "setup") {
		await handleSetup(interaction, guildId);
	} else if (sub === "token") {
		await handleToken(interaction, guildId);
	} else if (sub === "rotate") {
		await handleRotate(interaction, guildId);
	} else if (sub === "remove") {
		await handleRemove(interaction, guildId);
	} else if (sub === "status") {
		await handleStatus(interaction, guildId);
	} else if (sub === "help") {
		await handleHelp(interaction);
	}
}
