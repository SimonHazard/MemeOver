import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { guildRegistry } from "../../utils/registry";
import { buildConnectionFields, connectionActionRows, notConfiguredEmbed } from "../connection";
import { infoEmbed } from "../embeds";

export async function handleToken(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const locale = interactionLocale(interaction);
	const cfg = guildRegistry.getConfig(guildId);

	if (!cfg) {
		const embed = notConfiguredEmbed(locale);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	const embed = infoEmbed(
		t(locale, "token.title"),
		undefined,
		buildConnectionFields({ guildId, token: cfg.token, locale, config: cfg }),
	);

	await interaction.reply({
		embeds: [embed],
		components: connectionActionRows(locale),
		flags: MessageFlags.Ephemeral,
	});
}
