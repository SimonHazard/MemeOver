import {
	type ChatInputCommandInteraction,
	type Interaction,
	InteractionContextType,
	PermissionFlagsBits,
	REST,
	Routes,
	SlashCommandBuilder,
	type SlashCommandSubcommandBuilder,
} from "discord.js";
import { Redacted } from "effect";
import { type BotTranslationKey, frLocalization, interactionLocale, t } from "../i18n";
import { CAPTION_MAX_LENGTH } from "../media/extractor";
import { config } from "../utils/config";
import { PAUSE_CHOICES } from "../utils/guild-pause";
import { logger } from "../utils/logger";
import { handleComponentInteraction } from "./component-actions";
import { errorResponse } from "./response-panel";
import { handleBots } from "./subcommands/bots";
import { handleHelp } from "./subcommands/help";
import { handlePause } from "./subcommands/pause";
import { handleRemove } from "./subcommands/remove";
import { handleResume } from "./subcommands/resume";
import { handleRotate } from "./subcommands/rotate";
import { handleSecret } from "./subcommands/secret";
import { handleSetup } from "./subcommands/setup";
import { handleStatus } from "./subcommands/status";
import { handleToken } from "./subcommands/token";

const log = logger.child({ module: "commands" });

// ─── Command definitions ──────────────────────────────────────────────────────

const en = (key: BotTranslationKey) => t("en", key);
const fr = (key: BotTranslationKey) => frLocalization(key);

interface SubcommandDefinition {
	name: string;
	privileged: boolean;
	handle: (interaction: ChatInputCommandInteraction, guildId: string) => Promise<void>;
	configure?: (sub: SlashCommandSubcommandBuilder) => SlashCommandSubcommandBuilder;
}

const subcommands: readonly SubcommandDefinition[] = [
	{
		name: "setup",
		privileged: true,
		handle: handleSetup,
		configure: (sub) =>
			sub.addChannelOption((opt) =>
				opt
					.setName(en("commands.setup.channel.name"))
					.setDescription(en("commands.setup.channel.description"))
					.setDescriptionLocalizations(fr("commands.setup.channel.description"))
					.setRequired(false),
			),
	},
	{
		name: "token",
		privileged: false,
		handle: handleToken,
	},
	{
		name: "rotate",
		privileged: true,
		handle: handleRotate,
	},
	{
		name: "remove",
		privileged: true,
		handle: handleRemove,
	},
	{
		name: "bots",
		privileged: true,
		handle: handleBots,
		configure: (sub) =>
			sub.addBooleanOption((opt) =>
				opt
					.setName(en("commands.bots.enabled.name"))
					.setDescription(en("commands.bots.enabled.description"))
					.setDescriptionLocalizations(fr("commands.bots.enabled.description"))
					.setRequired(true),
			),
	},
	{
		name: "secret",
		privileged: false,
		handle: handleSecret,
		configure: (sub) =>
			sub
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
						.setMaxLength(CAPTION_MAX_LENGTH)
						.setRequired(false),
				),
	},
	{
		name: "status",
		privileged: true,
		handle: handleStatus,
	},
	{
		name: "pause",
		privileged: true,
		handle: handlePause,
		configure: (sub) =>
			sub.addStringOption((opt) =>
				opt
					.setName("duration")
					.setDescription(en("commands.pause.duration.description"))
					.setDescriptionLocalizations(fr("commands.pause.duration.description"))
					.setRequired(true)
					.addChoices(
						...Object.keys(PAUSE_CHOICES).map((choice) => ({
							name: en(`commands.pause.choice.${choice}` as BotTranslationKey),
							value: choice,
							name_localizations: fr(`commands.pause.choice.${choice}` as BotTranslationKey),
						})),
					),
			),
	},
	{
		name: "resume",
		privileged: true,
		handle: handleResume,
	},
	{
		name: "help",
		privileged: false,
		handle: handleHelp,
	},
];

export const memeover = new SlashCommandBuilder()
	.setName("memeover")
	.setDescription(en("commands.memeover.description"))
	.setDescriptionLocalizations(fr("commands.memeover.description"))
	.setContexts(InteractionContextType.Guild);

for (const definition of subcommands) {
	memeover.addSubcommand((sub) => {
		sub
			.setName(en(`commands.${definition.name}.name` as BotTranslationKey))
			.setDescription(en(`commands.${definition.name}.description` as BotTranslationKey))
			.setDescriptionLocalizations(
				fr(`commands.${definition.name}.description` as BotTranslationKey),
			);
		return definition.configure?.(sub) ?? sub;
	});
}

// ─── Command registration ─────────────────────────────────────────────────────

export async function registerCommands(): Promise<void> {
	const rest = new REST().setToken(Redacted.value(config.discordToken));
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

	const name = interaction.options.getSubcommand();
	const sub = subcommands.find((definition) => definition.name === name);
	if (!sub) return;

	if (sub.privileged) {
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

	await sub.handle(interaction, guildId);
}
