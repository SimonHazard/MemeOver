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
import { handleSecret } from "./subcommands/secret";
import { handleSetup } from "./subcommands/setup";
import { handleStatus } from "./subcommands/status";
import { handleToken } from "./subcommands/token";

const log = logger.child({ module: "commands" });

// ─── Command definitions ──────────────────────────────────────────────────────

const fr = (value: string) => ({ fr: value });

const memeover = new SlashCommandBuilder()
	.setName("memeover")
	.setDescription("Manage MemeOver for this server")
	.setDescriptionLocalizations(fr("Gérer MemeOver sur ce serveur"))
	.addSubcommand((sub) =>
		sub
			.setName("setup")
			.setNameLocalizations(fr("configurer"))
			.setDescription(
				"Register this server. Omit #channel to watch all channels; specify one to add it to the list.",
			)
			.setDescriptionLocalizations(
				fr("Configurer ce serveur. Omettez #salon pour écouter tous les salons."),
			)
			.addChannelOption((opt) =>
				opt
					.setName("channel")
					.setNameLocalizations(fr("salon"))
					.setDescription("Add a specific channel to watch (omit to watch all channels)")
					.setDescriptionLocalizations(fr("Ajouter un salon précis à écouter"))
					.setRequired(false),
			),
	)
	.addSubcommand((sub) =>
		sub
			.setName("token")
			.setNameLocalizations(fr("jeton"))
			.setDescription("Show your connection credentials (only visible to you)")
			.setDescriptionLocalizations(fr("Afficher les identifiants de connexion")),
	)
	.addSubcommand((sub) =>
		sub
			.setName("rotate")
			.setNameLocalizations(fr("renouveler"))
			.setDescription("Generate a new connection token, invalidating the current one")
			.setDescriptionLocalizations(fr("Générer un nouveau jeton de connexion")),
	)
	.addSubcommand((sub) =>
		sub
			.setName("remove")
			.setNameLocalizations(fr("retirer"))
			.setDescription("Unregister this server from MemeOver")
			.setDescriptionLocalizations(fr("Retirer ce serveur de MemeOver")),
	)
	.addSubcommand((sub) =>
		sub
			.setName("secret")
			.setNameLocalizations(fr("secret"))
			.setDescription("Send an anonymous meme with optional caption text")
			.setDescriptionLocalizations(fr("Envoyer un meme anonyme avec une légende optionnelle"))
			.addAttachmentOption((opt) =>
				opt
					.setName("media")
					.setNameLocalizations(fr("media"))
					.setDescription("Image, GIF, video or audio file to send anonymously")
					.setDescriptionLocalizations(fr("Image, GIF, vidéo ou audio à envoyer anonymement"))
					.setRequired(false),
			)
			.addStringOption((opt) =>
				opt
					.setName("url")
					.setNameLocalizations(fr("url"))
					.setDescription("Direct media link (Discord CDN, Tenor, Giphy, Imgur)")
					.setDescriptionLocalizations(fr("Lien direct vers un média"))
					.setRequired(false),
			)
			.addStringOption((opt) =>
				opt
					.setName("text")
					.setNameLocalizations(fr("texte"))
					.setDescription("Optional caption displayed with the secret meme")
					.setDescriptionLocalizations(fr("Légende optionnelle affichée avec le meme"))
					.setMaxLength(140)
					.setRequired(false),
			),
	)
	.addSubcommand((sub) =>
		sub
			.setName("status")
			.setNameLocalizations(fr("statut"))
			.setDescription("Show bot configuration, watched channels, and uptime")
			.setDescriptionLocalizations(fr("Afficher la configuration, les salons et l'uptime")),
	)
	.addSubcommand((sub) =>
		sub
			.setName("help")
			.setNameLocalizations(fr("aide"))
			.setDescription("List all MemeOver commands and what they do")
			.setDescriptionLocalizations(fr("Lister les commandes MemeOver")),
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
	} else if (sub === "secret") {
		await handleSecret(interaction, guildId);
	} else if (sub === "status") {
		await handleStatus(interaction, guildId);
	} else if (sub === "help") {
		await handleHelp(interaction);
	}
}
