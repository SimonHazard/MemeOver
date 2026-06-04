import { buildConnectionCode } from "@memeover/shared";
import {
	ButtonBuilder,
	ButtonStyle,
	type InteractionReplyOptions,
	type InteractionUpdateOptions,
} from "discord.js";
import { type BotLocale, t } from "../i18n";
import { config as botConfig } from "../utils/config";
import type { GuildConfig } from "../utils/registry";
import { errorResponse, type PanelField, panelResponse, panelUpdate } from "./response-panel";

const MEMEOVER_SITE_URL = "https://memeover.simonhazard.com";

function codeBlock(value: string): string {
	return `\`\`\`\n${value}\n\`\`\``;
}

export function formatWatchedChannels(
	channelIds: readonly string[],
	locale: BotLocale = "en",
): string {
	return channelIds.length > 0
		? channelIds.map((id) => `<#${id}>`).join(", ")
		: t(locale, "common.allChannels");
}

export function formatBotAppSources(enabled: boolean, locale: BotLocale = "en"): string {
	return enabled ? t(locale, "common.enabled") : t(locale, "common.muted");
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
	config?: Pick<GuildConfig, "channel_ids" | "allow_bot_app_sources">;
	tokenLabel?: string;
	includeWatching?: boolean;
}): PanelField[] {
	const fields: PanelField[] = [];
	if (includeWatching && config) {
		fields.push({
			name: t(locale, "common.watching"),
			value: formatWatchedChannels(config.channel_ids, locale),
			inline: false,
		});
		fields.push({
			name: t(locale, "common.botAppSources"),
			value: formatBotAppSources(config.allow_bot_app_sources, locale),
			inline: true,
		});
	}

	fields.push(
		{ name: t(locale, "common.serverId"), value: `\`${guildId}\``, inline: true },
		{ name: tokenLabel ?? t(locale, "common.token"), value: codeBlock(token), inline: false },
		{
			name: t(locale, "common.appSetupCode"),
			value: codeBlock(buildConnectionCode({ guildId, token, wsUrl: botConfig.publicWsUrl })),
			inline: false,
		},
	);

	return fields;
}

export function notConfiguredResponse(
	locale: BotLocale = "en",
	description?: string,
): InteractionReplyOptions {
	return errorResponse(
		t(locale, "common.notConfiguredTitle"),
		description ?? t(locale, "common.notConfiguredDescription"),
	);
}

export function notConfiguredUpdate(
	locale: BotLocale = "en",
	description?: string,
): InteractionUpdateOptions {
	return panelUpdate({
		tone: "error",
		title: t(locale, "common.notConfiguredTitle"),
		description: description ?? t(locale, "common.notConfiguredDescription"),
	});
}

function openMemeOverButton(locale: BotLocale): ButtonBuilder {
	return new ButtonBuilder()
		.setStyle(ButtonStyle.Link)
		.setURL(MEMEOVER_SITE_URL)
		.setLabel(t(locale, "common.openMemeOver"));
}

interface ConnectionPanelOptions {
	tone: "success" | "info" | "warning";
	title: string;
	description?: string;
	guildId: string;
	token: string;
	locale?: BotLocale;
	config?: Pick<GuildConfig, "channel_ids" | "allow_bot_app_sources">;
	tokenLabel?: string;
	includeWatching?: boolean;
}

function connectionPanelOptions({
	tone,
	title,
	description,
	guildId,
	token,
	locale = "en",
	config,
	tokenLabel,
	includeWatching = true,
}: ConnectionPanelOptions) {
	return {
		tone,
		title,
		description,
		button: openMemeOverButton(locale),
		fields: buildConnectionFields({
			guildId,
			token,
			locale,
			config,
			tokenLabel,
			includeWatching,
		}),
	};
}

export function connectionResponse(options: ConnectionPanelOptions): InteractionReplyOptions {
	return panelResponse(connectionPanelOptions(options));
}

export function connectionUpdate(options: ConnectionPanelOptions): InteractionUpdateOptions {
	return panelUpdate(connectionPanelOptions(options));
}
