import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { guildRegistry } from "../../utils/registry";
import { errorEmbed, infoEmbed } from "../embeds";

export async function handleToken(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const cfg = guildRegistry.getConfig(guildId);

	if (!cfg) {
		const embed = errorEmbed(
			"Not configured",
			"This server has not been set up yet. Run `/memeover setup` first.",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	const watchingValue =
		cfg.channel_ids.length > 0
			? cfg.channel_ids.map((id) => `<#${id}>`).join(", ")
			: "All channels";

	const embed = infoEmbed("Your MemeOver connection credentials", undefined, [
		{ name: "📺 Watching", value: watchingValue, inline: false },
		{ name: "🏠 Server ID", value: `\`${guildId}\``, inline: true },
		{ name: "🔑 Token", value: `\`\`\`${cfg.token}\`\`\``, inline: false },
	]);

	await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
