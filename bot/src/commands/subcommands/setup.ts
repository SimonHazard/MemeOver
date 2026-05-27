import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { schedulePresenceRefresh } from "../../utils/presence";
import { guildRegistry } from "../../utils/registry";
import { buildConnectionFields, connectionActionRows } from "../connection";
import { successEmbed } from "../embeds";

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

	const embed = successEmbed(
		t(locale, isUpdate ? "setup.updatedTitle" : "setup.configuredTitle"),
		t(locale, "setup.description"),
		buildConnectionFields({
			guildId,
			token,
			locale,
			config: cfg ?? { channel_ids: [] },
		}),
	);

	await interaction.reply({
		embeds: [embed],
		components: connectionActionRows(locale),
		flags: MessageFlags.Ephemeral,
	});
}
