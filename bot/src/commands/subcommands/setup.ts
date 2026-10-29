import type { ChatInputCommandInteraction } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { discordRefLogFields, logHash } from "../../utils/log-privacy";
import { logger } from "../../utils/logger";
import { schedulePresenceRefresh } from "../../utils/presence";
import { guildRegistry } from "../../utils/registry";
import { connectionResponse } from "../connection";

const log = logger.child({ module: "setup" });

export async function handleSetup(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const locale = interactionLocale(interaction);
	const channelOption = interaction.options.getChannel("channel");
	// null → watch all channels; string → add this specific channel to the list
	const channelId = channelOption?.id ?? null;

	const isUpdate = guildRegistry.isRegistered(guildId);
	const token = guildRegistry.register(guildId, channelId);
	log.info(
		{
			event: "admin_setup",
			...discordRefLogFields({ guildId, channelId }),
			actor: logHash(interaction.user?.id),
		},
		"Guild registered",
	);
	schedulePresenceRefresh();

	const cfg = guildRegistry.getConfig(guildId);

	await interaction.reply(
		connectionResponse({
			tone: "success",
			title: t(locale, isUpdate ? "setup.updatedTitle" : "setup.configuredTitle"),
			description: t(locale, "setup.description"),
			guildId,
			token,
			locale,
			config: cfg ?? { channel_ids: [], allow_bot_app_sources: false },
		}),
	);
}
