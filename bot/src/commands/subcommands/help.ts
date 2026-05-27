import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { infoEmbed } from "../embeds";

export async function handleHelp(interaction: ChatInputCommandInteraction): Promise<void> {
	const locale = interactionLocale(interaction);
	const embed = infoEmbed(t(locale, "help.title"), t(locale, "help.description"), [
		{
			name: "/memeover setup [#channel]",
			value: t(locale, "help.setup"),
			inline: false,
		},
		{
			name: "/memeover token",
			value: t(locale, "help.token"),
			inline: false,
		},
		{
			name: "/memeover secret media:<file> url:<link> text:<caption>",
			value: t(locale, "help.secret"),
			inline: false,
		},
		{
			name: "/memeover rotate",
			value: t(locale, "help.rotate"),
			inline: false,
		},
		{
			name: "/memeover remove",
			value: t(locale, "help.remove"),
			inline: false,
		},
		{
			name: "/memeover status",
			value: t(locale, "help.status"),
			inline: false,
		},
		{
			name: "/memeover help",
			value: t(locale, "help.help"),
			inline: false,
		},
	]);

	await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
