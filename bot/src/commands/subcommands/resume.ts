import type { ChatInputCommandInteraction } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { isPausedAt } from "../../utils/guild-pause";
import { applyGuildPause } from "../../utils/guild-pause-timers";
import { discordRefLogFields, logHash } from "../../utils/log-privacy";
import { logger } from "../../utils/logger";
import { guildRegistry } from "../../utils/registry";
import { notConfiguredResponse } from "../connection";
import { infoResponse, successResponse } from "../response-panel";

const log = logger.child({ module: "resume" });

export async function handleResume(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const locale = interactionLocale(interaction),
		cfg = guildRegistry.getConfig(guildId);
	if (!cfg) {
		await interaction.reply(notConfiguredResponse(locale));
		return;
	}
	if (!isPausedAt(cfg, Date.now())) {
		await interaction.reply(
			infoResponse(t(locale, "resume.notPausedTitle"), t(locale, "resume.notPausedDescription")),
		);
		return;
	}
	if (!applyGuildPause(guildId, null)) {
		await interaction.reply(notConfiguredResponse(locale));
		return;
	}
	log.info(
		{
			event: "admin_resume",
			...discordRefLogFields({ guildId }),
			actor: logHash(interaction.user?.id),
		},
		"Guild broadcast resumed",
	);
	await interaction.reply(
		successResponse(t(locale, "resume.successTitle"), t(locale, "resume.successDescription")),
	);
}
