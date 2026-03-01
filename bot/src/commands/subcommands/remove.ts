import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { guildRegistry } from "../../utils/registry";

export async function handleRemove(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	if (!guildRegistry.isRegistered(guildId)) {
		await interaction.reply({
			content: "❌ This server is not registered with MemeOver.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	guildRegistry.unregister(guildId);

	await interaction.reply({
		content:
			"✅ This server has been removed from MemeOver. All active sessions will be rejected on next reconnect.",
		flags: MessageFlags.Ephemeral,
	});
}
