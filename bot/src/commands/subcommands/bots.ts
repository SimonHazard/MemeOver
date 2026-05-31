import type { ChatInputCommandInteraction } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { guildRegistry } from "../../utils/registry";
import { formatBotAppSources, notConfiguredResponse } from "../connection";
import { successResponse } from "../response-panel";

export async function handleBots(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const locale = interactionLocale(interaction);
	const enabled = interaction.options.getBoolean("enabled", true);
	const cfg = guildRegistry.setBotAppSources(guildId, enabled);

	if (!cfg) {
		await interaction.reply(notConfiguredResponse(locale));
		return;
	}

	await interaction.reply(
		successResponse(
			t(locale, enabled ? "bots.enabledTitle" : "bots.mutedTitle"),
			`${t(locale, enabled ? "bots.enabledDescription" : "bots.mutedDescription")}\n\n${t(
				locale,
				"common.botAppSources",
			)}: **${formatBotAppSources(cfg.allow_bot_app_sources, locale)}**`,
		),
	);
}
