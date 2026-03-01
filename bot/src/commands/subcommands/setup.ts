import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { guildRegistry } from "../../utils/registry";

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
	const watchingLine =
		cfg && cfg.channel_ids.length > 0
			? `📺 Watching: ${cfg.channel_ids.map((id) => `<#${id}>`).join(", ")}`
			: "📺 Watching: **All channels**";

	await interaction.reply({
		content: [
			isUpdate ? "✅ **MemeOver updated!**" : "✅ **MemeOver configured!**",
			"",
			watchingLine,
			`🏠 Server ID: \`${guildId}\``,
			"",
			"🔑 **Connection token** (keep it private!):",
			`\`\`\`${token}\`\`\``,
			"Use the Server ID and Token in the MemeOver app to start receiving media.",
			"",
			"Tip: run `/memeover setup #channel` to add a channel to the watch list.",
		].join("\n"),
		flags: MessageFlags.Ephemeral,
	});
}
