import { ActionRowBuilder, type APIEmbedField, ButtonBuilder, ButtonStyle } from "discord.js";
import { type BotLocale, t } from "../i18n";
import { config } from "../utils/config";
import type { GuildConfig } from "../utils/registry";
import { errorEmbed } from "./embeds";

const MEMEOVER_SITE_URL = "https://memeover.simonhazard.com";

export function buildConnectionCode(guildId: string, token: string): string {
	const params = new URLSearchParams({
		guild_id: guildId,
		token,
		ws_url: config.publicWsUrl,
	});
	return `memeover://setup?${params.toString()}`;
}

export function formatWatchedChannels(
	channelIds: readonly string[],
	locale: BotLocale = "en",
): string {
	return channelIds.length > 0
		? channelIds.map((id) => `<#${id}>`).join(", ")
		: t(locale, "common.allChannels");
}

export function buildConnectionFields({
	guildId,
	token,
	locale = "en",
	config,
	tokenLabel,
	includeWatching = true,
}: {
	guildId: string;
	token: string;
	locale?: BotLocale;
	config?: Pick<GuildConfig, "channel_ids">;
	tokenLabel?: string;
	includeWatching?: boolean;
}): APIEmbedField[] {
	const fields: APIEmbedField[] = [];
	if (includeWatching && config) {
		fields.push({
			name: t(locale, "common.watching"),
			value: formatWatchedChannels(config.channel_ids, locale),
			inline: false,
		});
	}

	fields.push(
		{ name: t(locale, "common.serverId"), value: `\`${guildId}\``, inline: true },
		{ name: tokenLabel ?? t(locale, "common.token"), value: `\`\`\`${token}\`\`\``, inline: false },
		{
			name: t(locale, "common.appSetupCode"),
			value: `\`\`\`${buildConnectionCode(guildId, token)}\`\`\``,
			inline: false,
		},
	);

	return fields;
}

export function notConfiguredEmbed(locale: BotLocale = "en", description?: string) {
	return errorEmbed(
		t(locale, "common.notConfiguredTitle"),
		description ?? t(locale, "common.notConfiguredDescription"),
	);
}

export function connectionActionRows(locale: BotLocale = "en"): ActionRowBuilder<ButtonBuilder>[] {
	return [
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setURL(MEMEOVER_SITE_URL)
				.setLabel(t(locale, "common.openMemeOver")),
		),
	];
}
