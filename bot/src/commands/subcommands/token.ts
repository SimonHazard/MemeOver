import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { guildRegistry } from "../../utils/registry";

export async function handleToken(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const cfg = guildRegistry.getConfig(guildId);

	if (!cfg) {
		await interaction.reply({
			content: "❌ This server has not been set up yet. Run `/memeover setup` first.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const channels =
		cfg.channel_ids.length > 0
			? cfg.channel_ids.map((id) => `<#${id}>`).join(", ")
			: "All channels";

	await interaction.reply({
		content: [
			"🔑 **Your MemeOver connection credentials:**",
			"",
			`🏠 Server ID: \`${guildId}\``,
			`📺 Watching: ${channels}`,
			"",
			"Token:",
			`\`\`\`${cfg.token}\`\`\``,
		].join("\n"),
		flags: MessageFlags.Ephemeral,
	});
}
