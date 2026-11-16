import type { Client, MessageCreateOptions } from "discord.js";
import { Cause, Clock, Context, Data, Effect, FiberMap, Layer, Schedule } from "effect";
import type { Logger } from "pino";
import { publicPanelMessage } from "../commands/response-panel";
import { resolveBotLocale, t } from "../i18n";
import { discordRefLogFields } from "../utils/log-privacy";
import { logger } from "../utils/logger";
import { schedulePresenceRefresh } from "../utils/presence";
import { type GuildConfig, guildRegistry } from "../utils/registry";
import { store } from "../utils/store";

const CLEANUP_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const CLEANUP_THRESHOLD_MS = 48 * 60 * 60 * 1000;

type CleanupReason = "inactive_48h" | "single_unique_client";

interface SendableTextChannel {
	readonly id: string;
	isTextBased(): boolean;
	send(options: MessageCreateOptions): unknown;
}

export class GuildFetchError extends Data.TaggedError("GuildFetchError")<{ cause: unknown }> {}
export class ChannelsFetchError extends Data.TaggedError("ChannelsFetchError")<{
	cause: unknown;
}> {}
export class NoticeSendError extends Data.TaggedError("NoticeSendError")<{ cause: unknown }> {}

export class GuildEvictor extends Context.Service<
	GuildEvictor,
	{
		evict: (guildId: string, code: "GUILD_UNREGISTERED", message: string, reason: string) => number;
	}
>()("memeover/GuildEvictor") {}

export class BackgroundJobs extends Context.Service<
	BackgroundJobs,
	{ start: (key: string, job: Effect.Effect<void>) => Effect.Effect<void> }
>()("memeover/BackgroundJobs") {
	static readonly layer = Layer.effect(
		BackgroundJobs,
		Effect.gen(function* () {
			const jobs = yield* FiberMap.make<string, void, never>();
			return {
				start: (key, job) =>
					FiberMap.run(jobs, key, job, { onlyIfMissing: true }).pipe(Effect.asVoid),
			};
		}),
	);
}

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

export function cleanupReason(
	guildId: string,
	cfg: GuildConfig,
	now: number,
): CleanupReason | null {
	const activeClients = store.getGuildMembers(guildId).size;
	const inactiveSince = cfg.last_active_at ?? cfg.registered_at;

	if (activeClients === 0 && now - inactiveSince >= CLEANUP_THRESHOLD_MS) {
		return "inactive_48h";
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

function trySendNotice(
	log: Logger,
	channel: unknown,
	guildId: string,
	notice: MessageCreateOptions,
) {
	if (!isSendableTextChannel(channel)) return Effect.succeed(false);
	return Effect.tryPromise({
		try: async () => {
			await channel.send(notice);
			return true;
		},
		catch: (cause) => new NoticeSendError({ cause }),
	}).pipe(
		Effect.catchTag("NoticeSendError", ({ cause }) =>
			Effect.sync(() => {
				log.warn(
					{
						...discordRefLogFields({ guildId, channelId: channel.id }),
						event: "cleanup_notice_failed",
						err: cause,
					},
					"Failed to send cleanup notice",
				);
				return false;
			}),
		),
	);
}

function postCleanupNotice(log: Logger, client: Client, guildId: string, cfg: GuildConfig) {
	return Effect.gen(function* () {
		const guild = yield* Effect.tryPromise({
			try: () => client.guilds.fetch(guildId),
			catch: (cause) => new GuildFetchError({ cause }),
		}).pipe(
			Effect.catchTag("GuildFetchError", ({ cause }) =>
				Effect.sync(() => {
					log.warn(
						{
							...discordRefLogFields({ guildId }),
							event: "cleanup_guild_fetch_failed",
							err: cause,
						},
						"Failed to fetch guild for cleanup notice",
					);
					return null;
				}),
			),
		);
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
			const channel = yield* Effect.tryPromise({
				try: () => guild.channels.fetch(channelId),
				catch: (cause) => new ChannelsFetchError({ cause }),
			}).pipe(Effect.catchTag("ChannelsFetchError", () => Effect.succeed(null)));
			if (yield* trySendNotice(log, channel, guildId, notice)) return;
		}
		const fetchedChannels: unknown = yield* Effect.tryPromise({
			try: () => guild.channels.fetch(),
			catch: (cause) => new ChannelsFetchError({ cause }),
		}).pipe(
			Effect.catchTag("ChannelsFetchError", ({ cause }) =>
				Effect.sync(() => {
					log.warn(
						{
							...discordRefLogFields({ guildId }),
							event: "cleanup_channels_fetch_failed",
							err: cause,
						},
						"Failed to fetch guild channels for cleanup notice",
					);
					return null;
				}),
			),
		);
		if (hasValues(fetchedChannels)) {
			for (const channel of fetchedChannels.values()) {
				if (yield* trySendNotice(log, channel, guildId, notice)) return;
			}
		}
		log.warn(
			{ ...discordRefLogFields({ guildId }), event: "cleanup_notice_unposted" },
			"Could not post cleanup notice in guild",
		);
	});
}

export class GuildCleanup extends Context.Service<
	GuildCleanup,
	{
		run: (client: Client, scanAt?: number) => Effect.Effect<void>;
		unregister: (guildId: string) => Effect.Effect<boolean>;
		start: (client: Client) => Effect.Effect<void>;
		loop: (client: Client) => Effect.Effect<void>;
	}
>()("memeover/GuildCleanup") {
	static readonly layer = Layer.effect(
		GuildCleanup,
		Effect.gen(function* () {
			const log = logger.child({ module: "cleanup" });
			const evictor = yield* GuildEvictor;
			const jobs = yield* BackgroundJobs;
			let running = false;
			const pass = (client: Client, scanAt?: number) =>
				Effect.gen(function* () {
					const now = scanAt ?? (yield* Clock.currentTimeMillis);
					for (const [guildId, cfg] of guildRegistry.getRegisteredGuilds()) {
						const reason = cleanupReason(guildId, cfg, now);
						if (!reason) continue;
						const currentConfig = guildRegistry.getConfig(guildId);
						if (
							!currentConfig ||
							cleanupReason(guildId, currentConfig, yield* Clock.currentTimeMillis) !== reason
						)
							continue;
						const activeClients = store.getGuildMembers(guildId).size;
						yield* postCleanupNotice(log, client, guildId, currentConfig);
						// Discord requests yield: activity and token identity must be checked again.
						const latestConfig = guildRegistry.getConfig(guildId);
						if (
							!latestConfig ||
							latestConfig.token !== currentConfig.token ||
							cleanupReason(guildId, latestConfig, yield* Clock.currentTimeMillis) !== reason
						)
							continue;
						guildRegistry.unregister(guildId);
						evictor.evict(
							guildId,
							"GUILD_UNREGISTERED",
							t("en", "cleanup.wsMessage"),
							t("en", "cleanup.wsCloseReason"),
						);
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
				});
			const run = (client: Client, scanAt?: number) =>
				Effect.acquireUseRelease(
					Effect.sync(() => {
						if (running) return false;
						running = true;
						return true;
					}),
					(acquired) => (acquired ? pass(client, scanAt) : Effect.void),
					(acquired) =>
						Effect.sync(() => {
							if (acquired) running = false;
						}),
				);
			return {
				run,
				unregister: (guildId) =>
					Effect.sync(() => {
						if (!guildRegistry.getConfig(guildId)) return false;
						guildRegistry.unregister(guildId);
						const evicted = evictor.evict(
							guildId,
							"GUILD_UNREGISTERED",
							t("en", "guildRemoved.wsMessage"),
							t("en", "guildRemoved.wsCloseReason"),
						);
						schedulePresenceRefresh();
						log.warn(
							{ ...discordRefLogFields({ guildId }), event: "guild_removed_unregistered", evicted },
							"Bot removed from guild; registration deleted",
						);
						return true;
					}),
				start: (client) => jobs.start("guild-cleanup", cleanupLoop(run(client), log)),
				loop: (client) => cleanupLoop(run(client), log),
			};
		}),
	);
}

function cleanupLoop<R>(
	pass: Effect.Effect<void, never, R>,
	log: Logger,
): Effect.Effect<void, never, R> {
	return pass.pipe(
		Effect.catchCause((cause) => {
			if (Cause.hasInterrupts(cause)) return Effect.failCause(cause);
			return Effect.sync(() =>
				log.error(
					{ event: "guild_cleanup_failed", err: Cause.squash(cause) },
					"Guild cleanup run failed",
				),
			);
		}),
		Effect.repeat(Schedule.spaced(CLEANUP_CHECK_INTERVAL_MS)),
		Effect.asVoid,
	);
}

export function runGuildCleanupPass(client: Client, scanAt?: number) {
	return Effect.flatMap(GuildCleanup, (cleanup) => cleanup.run(client, scanAt));
}

export function unregisterRemovedGuild(guildId: string) {
	return Effect.flatMap(GuildCleanup, (cleanup) => cleanup.unregister(guildId));
}

export function guildCleanupLoop(client: Client) {
	return Effect.flatMap(GuildCleanup, (cleanup) => cleanup.loop(client));
}
