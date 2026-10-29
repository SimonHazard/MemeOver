import type { ChatInputCommandInteraction } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { discordRefLogFields, logHash } from "../../utils/log-privacy";
import { logger } from "../../utils/logger";
import { guildRegistry } from "../../utils/registry";
import { formatBotAppSources, notConfiguredResponse } from "../connection";
import { successResponse } from "../response-panel";

const log = logger.child({ module: "bots" });

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

	log.info(
		{
			event: "admin_bots",
			...discordRefLogFields({ guildId }),
			actor: logHash(interaction.user?.id),
			enabled,
		},
		"Bot/app source policy updated",
	);
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
