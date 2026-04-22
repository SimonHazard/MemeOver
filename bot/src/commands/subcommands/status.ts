import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { guildRegistry } from "../../utils/registry";
import { store } from "../../utils/store";
import { infoEmbed } from "../embeds";

/** Format an uptime in seconds to a compact "Xd Yh Zm" or "Hh Mm Ss" string. */
function formatUptime(seconds: number): string {
	const total = Math.floor(seconds);
	const days = Math.floor(total / 86_400);
	const hours = Math.floor((total % 86_400) / 3_600);
	const minutes = Math.floor((total % 3_600) / 60);
	const secs = total % 60;

	if (days > 0) return `${days}d ${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
	if (minutes > 0) return `${minutes}m ${secs}s`;
	return `${secs}s`;
}

export async function handleStatus(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const cfg = guildRegistry.getConfig(guildId);
	const registered = cfg !== undefined;

	const watchingValue = !registered
		? "—"
		: cfg.channel_ids.length === 0
			? "All channels"
			: cfg.channel_ids.map((id) => `<#${id}>`).join(", ");

	const activeOverlays = store.getGuildMembers(guildId).size;

	const embed = infoEmbed("MemeOver status", undefined, [
		{
			name: "🔌 Registered",
			value: registered ? "✅ Yes" : "❌ Not configured — run `/memeover setup`",
			inline: false,
		},
		{ name: "📺 Watching", value: watchingValue, inline: false },
		{
			name: "🖥️ Active overlays",
			value: String(activeOverlays),
			inline: true,
		},
		{ name: "⏱️ Uptime", value: formatUptime(process.uptime()), inline: true },
	]);

	await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
