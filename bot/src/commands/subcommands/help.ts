import type { ChatInputCommandInteraction } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { panelResponse } from "../response-panel";

export async function handleHelp(interaction: ChatInputCommandInteraction): Promise<void> {
	const locale = interactionLocale(interaction);
	const blocks = [
		["/memeover setup [#channel]", t(locale, "help.setup")],
		["/memeover token", t(locale, "help.token")],
		["/memeover secret media:<file> url:<link> text:<caption>", t(locale, "help.secret")],
		["/memeover bots enabled:<true|false>", t(locale, "help.bots")],
		["/memeover rotate", t(locale, "help.rotate")],
		["/memeover remove", t(locale, "help.remove")],
		["/memeover status", t(locale, "help.status")],
		["/memeover help", t(locale, "help.help")],
	].map(([name, description]) => `**${name}**\n${description}`);

	await interaction.reply(
		panelResponse({
			tone: "info",
			title: t(locale, "help.title"),
			description: t(locale, "help.description"),
			blocks,
		}),
	);
}
