import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { guildRegistry } from "../../utils/registry";
import { buildConnectionFields, connectionActionRows, notConfiguredEmbed } from "../connection";
import { warningEmbed } from "../embeds";

export async function handleRotate(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const locale = interactionLocale(interaction);
	const newToken = guildRegistry.rotateToken(guildId);

	if (!newToken) {
		const embed = notConfiguredEmbed(locale);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	const embed = warningEmbed(
		t(locale, "rotate.title"),
		t(locale, "rotate.description"),
		buildConnectionFields({
			guildId,
			token: newToken,
			locale,
			tokenLabel: t(locale, "rotate.newToken"),
			includeWatching: false,
		}),
	);

	await interaction.reply({
		embeds: [embed],
		components: connectionActionRows(locale),
		flags: MessageFlags.Ephemeral,
	});
}
