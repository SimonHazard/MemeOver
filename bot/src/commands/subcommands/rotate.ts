import { ButtonStyle, type ChatInputCommandInteraction } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { guildRegistry } from "../../utils/registry";
import { actionButton } from "../component-actions";
import { notConfiguredResponse } from "../connection";
import { panelResponse } from "../response-panel";

export async function handleRotate(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const locale = interactionLocale(interaction);
	if (!guildRegistry.isRegistered(guildId)) {
		await interaction.reply(notConfiguredResponse(locale));
		return;
	}

	await interaction.reply(
		panelResponse({
			tone: "warning",
			title: t(locale, "rotate.confirmTitle"),
			description: t(locale, "rotate.confirmDescription"),
			actions: [
				actionButton({
					command: "rotate",
					action: "confirm",
					guildId,
					userId: interaction.user.id,
					label: t(locale, "rotate.confirmButton"),
					style: ButtonStyle.Primary,
				}),
				actionButton({
					command: "rotate",
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
