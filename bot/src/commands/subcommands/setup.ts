import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { guildRegistry } from "../../utils/registry";
import { successEmbed } from "../embeds";

export async function handleSetup(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const channelOption = interaction.options.getChannel("channel");
	// null → watch all channels; string → add this specific channel to the list
	const channelId = channelOption?.id ?? null;

	const isUpdate = guildRegistry.isRegistered(guildId);
	const token = guildRegistry.register(guildId, channelId);

	const cfg = guildRegistry.getConfig(guildId);
	const watchingValue =
		cfg && cfg.channel_ids.length > 0
			? cfg.channel_ids.map((id) => `<#${id}>`).join(", ")
			: "All channels";

	const embed = successEmbed(
		isUpdate ? "MemeOver updated" : "MemeOver configured",
		"Use the Server ID and Token below in the MemeOver app to start receiving media.\n\n_Tip: run `/memeover setup #channel` to add a channel to the watch list._",
		[
			{ name: "📺 Watching", value: watchingValue, inline: false },
			{ name: "🏠 Server ID", value: `\`${guildId}\``, inline: true },
			{ name: "🔑 Token", value: `\`\`\`${token}\`\`\``, inline: false },
		],
	);

	await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
