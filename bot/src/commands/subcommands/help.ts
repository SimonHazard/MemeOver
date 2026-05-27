import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { infoEmbed } from "../embeds";

export async function handleHelp(interaction: ChatInputCommandInteraction): Promise<void> {
	const embed = infoEmbed(
		"MemeOver — commands",
		"MemeOver streams the media posted in your Discord channels to a desktop overlay. Configure the bot below, then enter your credentials in the MemeOver app.",
		[
			{
				name: "/memeover setup [#channel]",
				value:
					"Register this server and get an app setup code. Omit `#channel` to watch all channels, or specify one to add it. Requires **Manage Server**.",
				inline: false,
			},
			{
				name: "/memeover token",
				value:
					"Display your connection credentials and one-line app setup code (ephemeral, visible only to you).",
				inline: false,
			},
			{
				name: "/memeover secret media:<file> url:<link> text:<caption>",
				value:
					"Send an anonymous media item to every connected overlay. Use either an uploaded file or direct URL, with optional caption text.",
				inline: false,
			},
			{
				name: "/memeover rotate",
				value:
					"Generate a new connection token. Any connected overlay will disconnect. Requires **Manage Server**.",
				inline: false,
			},
			{
				name: "/memeover remove",
				value: "Unregister this server from MemeOver. Requires **Manage Server**.",
				inline: false,
			},
			{
				name: "/memeover status",
				value: "Show bot configuration, watched channels, active overlays, and uptime.",
				inline: false,
			},
			{
				name: "/memeover help",
				value: "Show this help message.",
				inline: false,
			},
		],
	);

	await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
