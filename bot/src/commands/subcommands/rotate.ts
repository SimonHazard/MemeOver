import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { guildRegistry } from "../../utils/registry";
import { errorEmbed, warningEmbed } from "../embeds";

export async function handleRotate(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const newToken = guildRegistry.rotateToken(guildId);

	if (!newToken) {
		const embed = errorEmbed(
			"Not configured",
			"This server has not been set up yet. Run `/memeover setup` first.",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	const embed = warningEmbed(
		"Token rotated",
		"Your previous token is now invalid. Update the MemeOver app with the new token below.\n\n⚠️ Any connected overlay will disconnect and must reconnect with this new token.",
		[
			{ name: "🏠 Server ID", value: `\`${guildId}\``, inline: true },
			{ name: "🔑 New token", value: `\`\`\`${newToken}\`\`\``, inline: false },
		],
	);

	await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
