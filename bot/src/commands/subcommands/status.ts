import type { ChatInputCommandInteraction } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { guildRegistry } from "../../utils/registry";
import { store } from "../../utils/store";
import { formatBotAppSources, formatWatchedChannels } from "../connection";
import { infoResponse } from "../response-panel";

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
	const botsValue = cfg ? formatBotAppSources(cfg.allow_bot_app_sources, locale) : "—";

	const activeOverlays = store.getGuildMembers(guildId).size;

	await interaction.reply(
		infoResponse(t(locale, "status.title"), undefined, [
			{
				name: t(locale, "status.registered"),
				value: registered ? t(locale, "status.registeredYes") : t(locale, "status.notConfigured"),
			},
			{ name: t(locale, "common.watching"), value: watchingValue },
			{ name: t(locale, "common.botAppSources"), value: botsValue },
			{
				name: t(locale, "status.activeOverlays"),
				value: String(activeOverlays),
			},
			{ name: t(locale, "status.uptime"), value: formatUptime(process.uptime()) },
		]),
	);
}
