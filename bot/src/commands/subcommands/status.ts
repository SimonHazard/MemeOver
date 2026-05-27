import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { guildRegistry } from "../../utils/registry";
import { store } from "../../utils/store";
import { formatWatchedChannels } from "../connection";
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
	const locale = interactionLocale(interaction);
	const cfg = guildRegistry.getConfig(guildId);
	const registered = cfg !== undefined;

	const watchingValue = cfg ? formatWatchedChannels(cfg.channel_ids, locale) : "—";

	const activeOverlays = store.getGuildMembers(guildId).size;

	const embed = infoEmbed(t(locale, "status.title"), undefined, [
		{
			name: t(locale, "status.registered"),
			value: registered ? t(locale, "status.registeredYes") : t(locale, "status.notConfigured"),
			inline: false,
		},
		{ name: t(locale, "common.watching"), value: watchingValue, inline: false },
		{
			name: t(locale, "status.activeOverlays"),
			value: String(activeOverlays),
			inline: true,
		},
		{ name: t(locale, "status.uptime"), value: formatUptime(process.uptime()), inline: true },
	]);

	await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
