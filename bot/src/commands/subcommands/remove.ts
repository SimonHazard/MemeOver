import { ButtonStyle, type ChatInputCommandInteraction } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { guildRegistry } from "../../utils/registry";
import { actionButton } from "../component-actions";
import { notConfiguredResponse } from "../connection";
import { panelResponse } from "../response-panel";

export async function handleRemove(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const locale = interactionLocale(interaction);
	if (!guildRegistry.isRegistered(guildId)) {
		await interaction.reply(
			notConfiguredResponse(locale, t(locale, "remove.notConfiguredDescription")),
		);
		return;
	}

	await interaction.reply(
		panelResponse({
			tone: "warning",
			title: t(locale, "remove.confirmTitle"),
			description: t(locale, "remove.confirmDescription"),
			actions: [
				actionButton({
					command: "remove",
					action: "confirm",
					guildId,
					userId: interaction.user.id,
					label: t(locale, "remove.confirmButton"),
					style: ButtonStyle.Danger,
				}),
				actionButton({
					command: "remove",
					action: "cancel",
					guildId,
					userId: interaction.user.id,
					label: t(locale, "common.cancel"),
					style: ButtonStyle.Secondary,
				}),
			],
		}),
	);
}
