import type { ChatInputCommandInteraction } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { guildRegistry } from "../../utils/registry";
import { connectionResponse, notConfiguredResponse } from "../connection";

export async function handleToken(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const locale = interactionLocale(interaction);
	const cfg = guildRegistry.getConfig(guildId);

	if (!cfg) {
		await interaction.reply(notConfiguredResponse(locale));
		return;
	}

	await interaction.reply(
		connectionResponse({
			tone: "info",
			title: t(locale, "token.title"),
			guildId,
			token: cfg.token,
			locale,
			config: cfg,
		}),
	);
}
