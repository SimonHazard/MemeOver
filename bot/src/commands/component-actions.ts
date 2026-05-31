import {
	ButtonBuilder,
	type ButtonInteraction,
	type ButtonStyle,
	PermissionFlagsBits,
} from "discord.js";
import { interactionLocale, t } from "../i18n";
import { schedulePresenceRefresh } from "../utils/presence";
import { guildRegistry } from "../utils/registry";
import { connectionUpdate, notConfiguredUpdate } from "./connection";
import { errorResponse, panelUpdate } from "./response-panel";

type ComponentCommand = "remove" | "rotate";
type ComponentAction = "confirm" | "cancel";

interface ComponentId {
	command: ComponentCommand;
	action: ComponentAction;
	guildId: string;
	userId: string;
}

const CUSTOM_ID_PREFIX = "memeover";

export function actionButton({
	command,
	action,
	guildId,
	userId,
	label,
	style,
}: ComponentId & {
	label: string;
	style: ButtonStyle.Danger | ButtonStyle.Primary | ButtonStyle.Secondary;
}): ButtonBuilder {
	return new ButtonBuilder()
		.setCustomId([CUSTOM_ID_PREFIX, command, action, guildId, userId].join(":"))
		.setLabel(label)
		.setStyle(style);
}

function parseComponentId(customId: string): ComponentId | null {
	const [prefix, command, action, guildId, userId] = customId.split(":");
	if (prefix !== CUSTOM_ID_PREFIX) return null;
	if (command !== "remove" && command !== "rotate") return null;
	if (action !== "confirm" && action !== "cancel") return null;
	if (!guildId || !userId) return null;
	return { command, action, guildId, userId };
}

async function guardComponent(interaction: ButtonInteraction, id: ComponentId): Promise<boolean> {
	const locale = interactionLocale(interaction);

	if (interaction.user.id !== id.userId) {
		await interaction.reply(
			errorResponse(
				t(locale, "common.controlOwnerOnlyTitle"),
				t(locale, "common.controlOwnerOnlyDescription"),
			),
		);
		return false;
	}

	if (interaction.guildId !== id.guildId) {
		await interaction.update(notConfiguredUpdate(locale));
		return false;
	}

	if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
		await interaction.reply(
			errorResponse(
				t(locale, "common.permissionDeniedTitle"),
				t(locale, "common.permissionDeniedDescription"),
			),
		);
		return false;
	}

	return true;
}

async function handleRemoveComponent(
	interaction: ButtonInteraction,
	id: ComponentId,
): Promise<void> {
	const locale = interactionLocale(interaction);

	if (id.action === "cancel") {
		await interaction.update(
			panelUpdate({
				tone: "info",
				title: t(locale, "remove.cancelledTitle"),
				description: t(locale, "remove.cancelledDescription"),
			}),
		);
		return;
	}

	if (!guildRegistry.isRegistered(id.guildId)) {
		await interaction.update(
			notConfiguredUpdate(locale, t(locale, "remove.notConfiguredDescription")),
		);
		return;
	}

	guildRegistry.unregister(id.guildId);
	schedulePresenceRefresh();

	await interaction.update(
		panelUpdate({
			tone: "success",
			title: t(locale, "remove.successTitle"),
			description: t(locale, "remove.successDescription"),
		}),
	);
}

async function handleRotateComponent(
	interaction: ButtonInteraction,
	id: ComponentId,
): Promise<void> {
	const locale = interactionLocale(interaction);

	if (id.action === "cancel") {
		await interaction.update(
			panelUpdate({
				tone: "info",
				title: t(locale, "rotate.cancelledTitle"),
				description: t(locale, "rotate.cancelledDescription"),
			}),
		);
		return;
	}

	const newToken = guildRegistry.rotateToken(id.guildId);
	if (!newToken) {
		await interaction.update(notConfiguredUpdate(locale));
		return;
	}

	await interaction.update(
		connectionUpdate({
			tone: "warning",
			title: t(locale, "rotate.title"),
			description: t(locale, "rotate.description"),
			guildId: id.guildId,
			token: newToken,
			locale,
			tokenLabel: t(locale, "rotate.newToken"),
			includeWatching: false,
		}),
	);
}

export async function handleComponentInteraction(interaction: ButtonInteraction): Promise<boolean> {
	const id = parseComponentId(interaction.customId);
	if (!id) return false;
	if (!(await guardComponent(interaction, id))) return true;

	if (id.command === "remove") {
		await handleRemoveComponent(interaction, id);
	} else {
		await handleRotateComponent(interaction, id);
	}

	return true;
}
