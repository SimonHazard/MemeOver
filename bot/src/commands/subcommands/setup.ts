import type { ChatInputCommandInteraction } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { schedulePresenceRefresh } from "../../utils/presence";
import { guildRegistry } from "../../utils/registry";
import { connectionResponse } from "../connection";

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
