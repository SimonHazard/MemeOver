import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { guildRegistry } from "../../utils/registry";

export async function handleRotate(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const newToken = guildRegistry.rotateToken(guildId);

	if (!newToken) {
		await interaction.reply({
			content: "❌ This server has not been set up yet. Run `/memeover setup` first.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	await interaction.reply({
		content: [
			"🔄 **Token rotated successfully.**",
			"",
			"Your previous token is now invalid. Update the MemeOver app with the new token below:",
			"",
			`🏠 Server ID: \`${guildId}\``,
			"🔑 **New token:**",
			`\`\`\`${newToken}\`\`\``,
			"⚠️ Any connected overlay will disconnect and need to reconnect with this new token.",
		].join("\n"),
		flags: MessageFlags.Ephemeral,
	});
}
