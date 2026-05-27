import {
	type Interaction,
	InteractionContextType,
	PermissionFlagsBits,
	REST,
	Routes,
	SlashCommandBuilder,
} from "discord.js";
import { type BotTranslationKey, frLocalization, interactionLocale, t } from "../i18n";
import { config } from "../utils/config";
import { logger } from "../utils/logger";

import { handleComponentInteraction } from "./component-actions";
import { errorResponse } from "./response-panel";
import { handleHelp } from "./subcommands/help";
import { handleRemove } from "./subcommands/remove";
import { handleRotate } from "./subcommands/rotate";
import { handleSecret } from "./subcommands/secret";
import { handleSetup } from "./subcommands/setup";
import { handleStatus } from "./subcommands/status";
import { handleToken } from "./subcommands/token";

const log = logger.child({ module: "commands" });

// ─── Command definitions ──────────────────────────────────────────────────────

const en = (key: BotTranslationKey) => t("en", key);
const fr = (key: BotTranslationKey) => frLocalization(key);

const memeover = new SlashCommandBuilder()
	.setName("memeover")
	.setDescription(en("commands.memeover.description"))
	.setDescriptionLocalizations(fr("commands.memeover.description"))
	.setContexts(InteractionContextType.Guild)
	.addSubcommand((sub) =>
		sub
			.setName(en("commands.setup.name"))
			.setDescription(en("commands.setup.description"))
			.setDescriptionLocalizations(fr("commands.setup.description"))
			.addChannelOption((opt) =>
				opt
					.setName(en("commands.setup.channel.name"))
					.setDescription(en("commands.setup.channel.description"))
					.setDescriptionLocalizations(fr("commands.setup.channel.description"))
					.setRequired(false),
			),
	)
	.addSubcommand((sub) =>
		sub
			.setName(en("commands.token.name"))
			.setDescription(en("commands.token.description"))
			.setDescriptionLocalizations(fr("commands.token.description")),
	)
	.addSubcommand((sub) =>
		sub
			.setName(en("commands.rotate.name"))
			.setDescription(en("commands.rotate.description"))
			.setDescriptionLocalizations(fr("commands.rotate.description")),
	)
	.addSubcommand((sub) =>
		sub
			.setName(en("commands.remove.name"))
			.setDescription(en("commands.remove.description"))
			.setDescriptionLocalizations(fr("commands.remove.description")),
	)
	.addSubcommand((sub) =>
		sub
			.setName(en("commands.secret.name"))
			.setDescription(en("commands.secret.description"))
			.setDescriptionLocalizations(fr("commands.secret.description"))
			.addAttachmentOption((opt) =>
				opt
					.setName(en("commands.secret.media.name"))
					.setDescription(en("commands.secret.media.description"))
					.setDescriptionLocalizations(fr("commands.secret.media.description"))
					.setRequired(false),
			)
			.addStringOption((opt) =>
				opt
					.setName(en("commands.secret.url.name"))
					.setDescription(en("commands.secret.url.description"))
					.setDescriptionLocalizations(fr("commands.secret.url.description"))
					.setRequired(false),
			)
			.addStringOption((opt) =>
				opt
					.setName(en("commands.secret.text.name"))
					.setDescription(en("commands.secret.text.description"))
					.setDescriptionLocalizations(fr("commands.secret.text.description"))
					.setMaxLength(140)
					.setRequired(false),
			),
	)
	.addSubcommand((sub) =>
		sub
			.setName(en("commands.status.name"))
			.setDescription(en("commands.status.description"))
			.setDescriptionLocalizations(fr("commands.status.description")),
	)
	.addSubcommand((sub) =>
		sub
			.setName(en("commands.help.name"))
			.setDescription(en("commands.help.description"))
			.setDescriptionLocalizations(fr("commands.help.description")),
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
	if (interaction.isButton()) {
		await handleComponentInteraction(interaction);
		return;
	}

	if (!interaction.isChatInputCommand()) return;
	if (interaction.commandName !== "memeover") return;

	const guildId = interaction.guildId;
	const locale = interactionLocale(interaction);
	if (!guildId) {
		await interaction.reply(
			errorResponse(t(locale, "common.serverOnlyTitle"), t(locale, "common.serverOnlyDescription")),
		);
		return;
	}

	const sub = interaction.options.getSubcommand();

	if (PRIVILEGED_SUBS.has(sub)) {
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
			await interaction.reply(
				errorResponse(
					t(locale, "common.permissionDeniedTitle"),
					t(locale, "common.permissionDeniedDescription"),
				),
			);
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
