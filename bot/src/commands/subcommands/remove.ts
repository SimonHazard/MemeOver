import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { schedulePresenceRefresh } from "../../utils/presence";
import { guildRegistry } from "../../utils/registry";
import { notConfiguredEmbed } from "../connection";
import { successEmbed } from "../embeds";

export async function handleRemove(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const locale = interactionLocale(interaction);
	if (!guildRegistry.isRegistered(guildId)) {
		const embed = notConfiguredEmbed(locale, t(locale, "remove.notConfiguredDescription"));
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	guildRegistry.unregister(guildId);
	schedulePresenceRefresh();

	const embed = successEmbed(
		t(locale, "remove.successTitle"),
		t(locale, "remove.successDescription"),
	);
	await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
