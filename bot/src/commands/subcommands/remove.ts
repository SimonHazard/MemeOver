import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { guildRegistry } from "../../utils/registry";
import { errorEmbed, successEmbed } from "../embeds";

export async function handleRemove(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	if (!guildRegistry.isRegistered(guildId)) {
		const embed = errorEmbed("Not configured", "This server is not registered with MemeOver.");
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	guildRegistry.unregister(guildId);

	const embed = successEmbed(
		"Server removed",
		"This server has been removed from MemeOver. All active sessions will be rejected on next reconnect.",
	);
	await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
