import type { Client, MessageCreateOptions } from "discord.js";
import { publicPanelMessage } from "../commands/response-panel";
import { resolveBotLocale, t } from "../i18n";
import { discordRefLogFields } from "./log-privacy";
import { logger } from "./logger";
import { schedulePresenceRefresh } from "./presence";
import { type GuildConfig, guildRegistry } from "./registry";
import { store } from "./store";
import type { ServerMessage } from "./types";

const log = logger.child({ module: "cleanup" });

const CLEANUP_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const CLEANUP_THRESHOLD_MS = 24 * 60 * 60 * 1000;

type CleanupReason = "inactive_24h" | "single_unique_client";

interface SendableTextChannel {
	readonly id: string;
	isTextBased(): boolean;
	send(options: MessageCreateOptions): unknown;
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
let cleanupRunning = false;

function isSendableTextChannel(channel: unknown): channel is SendableTextChannel {
	if (typeof channel !== "object" || channel === null) return false;
	const candidate = channel as {
		id?: unknown;
		isTextBased?: unknown;
		send?: unknown;
	};

	return (
		typeof candidate.id === "string" &&
		typeof candidate.isTextBased === "function" &&
		candidate.isTextBased() === true &&
		typeof candidate.send === "function"
	);
}

function hasValues(value: unknown): value is { values(): IterableIterator<unknown> } {
	return (
		typeof value === "object" &&
		value !== null &&
		"values" in value &&
		typeof (value as { values?: unknown }).values === "function"
	);
}

function getCleanupNotice(locale: string | null | undefined): MessageCreateOptions {
	const botLocale = resolveBotLocale(locale);
	return publicPanelMessage({
		tone: "warning",
		title: t(botLocale, "cleanup.noticeTitle"),
		description: t(botLocale, "cleanup.notice"),
		suppressNotifications: true,
	});
}

function cleanupReason(guildId: string, cfg: GuildConfig, now: number): CleanupReason | null {
	const activeClients = store.getGuildMembers(guildId).size;
	const inactiveSince = cfg.last_active_at ?? cfg.registered_at;

	if (activeClients === 0 && now - inactiveSince >= CLEANUP_THRESHOLD_MS) {
		return "inactive_24h";
	}

	if (
		activeClients === 0 &&
		now - cfg.registered_at >= CLEANUP_THRESHOLD_MS &&
		cfg.unique_client_ids.length <= 1
	) {
		return "single_unique_client";
	}

	return null;
}

async function trySendNotice(
	channel: unknown,
	guildId: string,
	notice: MessageCreateOptions,
): Promise<boolean> {
	if (!isSendableTextChannel(channel)) return false;

	try {
		await channel.send(notice);
		return true;
	} catch (err) {
		log.warn(
			{
				...discordRefLogFields({ guildId, channelId: channel.id }),
				event: "cleanup_notice_failed",
				err,
			},
			"Failed to send cleanup notice",
		);
		return false;
	}
}

async function postCleanupNotice(client: Client, guildId: string, cfg: GuildConfig): Promise<void> {
	const guild = await client.guilds.fetch(guildId).catch((err: unknown) => {
		log.warn(
			{ ...discordRefLogFields({ guildId }), event: "cleanup_guild_fetch_failed", err },
			"Failed to fetch guild for cleanup notice",
		);
		return null;
	});
	if (!guild) return;

	const notice = getCleanupNotice(guild.preferredLocale);
	const fallbackIds = [
		guild.systemChannelId,
		guild.rulesChannelId,
		guild.publicUpdatesChannelId,
	].filter((id): id is string => typeof id === "string");
	const candidateIds = [...cfg.channel_ids, ...fallbackIds];
	const triedChannelIds = new Set<string>();

	for (const channelId of candidateIds) {
		if (triedChannelIds.has(channelId)) continue;
		triedChannelIds.add(channelId);

		const channel = await guild.channels.fetch(channelId).catch(() => null);
		if (await trySendNotice(channel, guildId, notice)) return;
	}

	const fetchedChannels: unknown = await guild.channels.fetch().catch((err: unknown) => {
		log.warn(
			{ ...discordRefLogFields({ guildId }), event: "cleanup_channels_fetch_failed", err },
			"Failed to fetch guild channels for cleanup notice",
		);
		return null;
	});

	if (hasValues(fetchedChannels)) {
		for (const channel of fetchedChannels.values()) {
			if (await trySendNotice(channel, guildId, notice)) return;
		}
	}

	log.warn(
		{ ...discordRefLogFields({ guildId }), event: "cleanup_notice_unposted" },
		"Could not post cleanup notice in guild",
	);
}

function closeGuildConnections(guildId: string): void {
	const payload = JSON.stringify({
		type: "ERROR",
		code: "GUILD_UNREGISTERED",
		message: t("en", "cleanup.wsMessage"),
	} satisfies ServerMessage);

	for (const wsId of [...store.getGuildMembers(guildId)]) {
		const client = store.getClient(wsId);
		if (!client) continue;

		try {
			client.ws_ref.send(payload);
			client.ws_ref.close(1008, t("en", "cleanup.wsCloseReason"));
		} catch (err) {
			log.warn(
				{ ...discordRefLogFields({ guildId, wsId }), event: "cleanup_ws_close_failed", err },
				"Failed to close cleaned-up guild client",
			);
		}
	}
}

export async function runGuildCleanup(client: Client, now = Date.now()): Promise<void> {
	if (cleanupRunning) return;
	cleanupRunning = true;

	try {
		for (const [guildId, cfg] of guildRegistry.getRegisteredGuilds()) {
			const reason = cleanupReason(guildId, cfg, now);
			if (!reason) continue;

			const currentConfig = guildRegistry.getConfig(guildId);
			if (!currentConfig || cleanupReason(guildId, currentConfig, Date.now()) !== reason) continue;

			const activeClients = store.getGuildMembers(guildId).size;
			await postCleanupNotice(client, guildId, currentConfig);
			guildRegistry.unregister(guildId);
			closeGuildConnections(guildId);
			schedulePresenceRefresh();

			log.warn(
				{
					...discordRefLogFields({ guildId }),
					event: "guild_cleanup_removed",
					reason,
					active_clients: activeClients,
					unique_clients: currentConfig.unique_client_ids.length,
				},
				"Removed guild registration during cleanup",
			);
		}
	} finally {
		cleanupRunning = false;
	}
}

export function startGuildCleanupScheduler(client: Client): void {
	if (cleanupTimer) return;

	void runGuildCleanup(client);
	cleanupTimer = setInterval(() => {
		void runGuildCleanup(client);
	}, CLEANUP_CHECK_INTERVAL_MS);
}
