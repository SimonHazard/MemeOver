import { expect, spyOn, test } from "bun:test";
import type { Client } from "discord.js";
import { Deferred, Effect, Fiber, Layer, ManagedRuntime } from "effect";
import { TestClock } from "effect/testing";
import { t } from "../i18n";
import { discordRefLogFields } from "../utils/log-privacy";
import { logger } from "../utils/logger";
import { guildRegistry } from "../utils/registry";
import { BackgroundJobs, GuildCleanup, GuildEvictor } from "./guild-cleanup";

const HOUR = 60 * 60 * 1000;
const EPOCH = 1_700_000_000_000;
let fixtureId = 0;

function fixture() {
	const guildId = `effect-cleanup-${++fixtureId}`;
	const evictions: unknown[][] = [];
	const deletedAtEviction: boolean[] = [];
	const child = logger.child<string>({ module: "cleanup" });
	const childSpy = spyOn(logger, "child").mockReturnValue(child);
	const warn = spyOn(child, "warn").mockImplementation(() => {});
	const error = spyOn(child, "error").mockImplementation(() => {});
	const runtime = ManagedRuntime.make(
		GuildCleanup.layer.pipe(
			Layer.provide(
				Layer.mergeAll(
					BackgroundJobs.layer,
					Layer.succeed(GuildEvictor, {
						evict: (...args) => {
							evictions.push(args);
							deletedAtEviction.push(guildRegistry.getConfig(args[0]) === undefined);
							return 2;
						},
					}),
				),
			),
			Layer.provideMerge(TestClock.layer()),
		),
	);
	const run = <A>(body: (cleanup: GuildCleanup["Service"]) => Effect.Effect<A>) =>
		runtime.runPromise(Effect.flatMap(GuildCleanup, body));
	const register = (channel: string | null = null) => {
		const clock = spyOn(Date, "now").mockReturnValue(EPOCH - 49 * HOUR);
		try {
			const token = guildRegistry.register(guildId, channel);
			guildRegistry.recordClientActivity(guildId, "one");
			guildRegistry.recordClientActivity(guildId, "two");
			return token;
		} finally {
			clock.mockRestore();
		}
	};
	return {
		runtime,
		guildId,
		evictions,
		deletedAtEviction,
		warn,
		error,
		run,
		register,
		prepare: () => runtime.runPromise(TestClock.setTime(EPOCH)),
		adjust: (ms: number) => runtime.runPromise(TestClock.adjust(ms)),
		async close() {
			await runtime.dispose();
			guildRegistry.unregister(guildId);
			error.mockRestore();
			warn.mockRestore();
			childSpy.mockRestore();
		},
	};
}
function discord(fetch: () => Promise<unknown>): Client {
	return { guilds: { fetch } } as unknown as Client;
}
const unavailable = discord(async () => null);

test("notice tries watched channels before deduplicated fallbacks and keeps localized copy", async () => {
	const f = fixture();
	const requests: Array<string | undefined> = [];
	const sent: unknown[] = [];
	const failure = new Error("Fixture forbidden channel");
	try {
		f.register("watched");
		await f.prepare();
		await f.run((cleanup) =>
			cleanup.run(
				discord(async () => ({
					preferredLocale: "fr",
					systemChannelId: "watched",
					rulesChannelId: "rules",
					publicUpdatesChannelId: "updates",
					channels: {
						fetch: async (id?: string) => {
							requests.push(id);
							return {
								id,
								isTextBased: () => true,
								send: async (notice: unknown) => {
									if (id === "watched") throw failure;
									sent.push(notice);
								},
							};
						},
					},
				})),
			),
		);
		expect(requests).toEqual(["watched", "rules"]);
		expect(JSON.stringify(sent)).toContain(t("fr", "cleanup.noticeTitle"));
		expect(f.warn).toHaveBeenCalledWith(
			{
				...discordRefLogFields({ guildId: f.guildId, channelId: "watched" }),
				event: "cleanup_notice_failed",
				err: failure,
			},
			"Failed to send cleanup notice",
		);
		expect(f.deletedAtEviction).toEqual([true]);
	} finally {
		await f.close();
	}
});

test("guild fetch failure logs its underlying error and does not prevent deletion", async () => {
	const f = fixture();
	const failure = new Error("Fixture Discord unavailable");
	try {
		f.register();
		await f.prepare();
		await f.run((cleanup) =>
			cleanup.run(
				discord(async () => {
					throw failure;
				}),
			),
		);
		expect(f.warn).toHaveBeenCalledWith(
			{
				...discordRefLogFields({ guildId: f.guildId }),
				event: "cleanup_guild_fetch_failed",
				err: failure,
			},
			"Failed to fetch guild for cleanup notice",
		);
		expect(guildRegistry.getConfig(f.guildId)).toBeUndefined();
		expect(f.deletedAtEviction).toEqual([true]);
	} finally {
		await f.close();
	}
});

test("failed channel listing keeps its exact warning and unposted notice warning", async () => {
	const f = fixture();
	const failure = new Error("Fixture list unavailable");
	try {
		f.register("missing");
		await f.prepare();
		await f.run((cleanup) =>
			cleanup.run(
				discord(async () => ({
					channels: {
						fetch: async (id?: string) => {
							if (id) throw new Error("Fixture missing channel");
							throw failure;
						},
					},
				})),
			),
		);
		expect(f.warn).toHaveBeenCalledWith(
			{
				...discordRefLogFields({ guildId: f.guildId }),
				event: "cleanup_channels_fetch_failed",
				err: failure,
			},
			"Failed to fetch guild channels for cleanup notice",
		);
		expect(f.warn).toHaveBeenCalledWith(
			{ ...discordRefLogFields({ guildId: f.guildId }), event: "cleanup_notice_unposted" },
			"Could not post cleanup notice in guild",
		);
		expect(f.evictions).toHaveLength(1);
	} finally {
		await f.close();
	}
});

test("fallback channel scan skips non-sendable channels and stops at its first successful notice", async () => {
	const f = fixture();
	const sent: string[] = [];
	try {
		f.register();
		await f.prepare();
		await f.run((cleanup) =>
			cleanup.run(
				discord(async () => ({
					channels: {
						fetch: async () =>
							new Map([
								["not-text", { id: "not-text", isTextBased: () => false }],
								["text", { id: "text", isTextBased: () => true, send: () => sent.push("text") }],
								["later", { id: "later", isTextBased: () => true, send: () => sent.push("later") }],
							]),
					},
				})),
			),
		);
		expect(sent).toEqual(["text"]);
		expect(
			f.warn.mock.calls.some(
				([fields]) =>
					typeof fields === "object" &&
					fields !== null &&
					"event" in fields &&
					fields.event === "cleanup_notice_unposted",
			),
		).toBe(false);
	} finally {
		await f.close();
	}
});

test("synchronous removal persists before eviction, is idempotent, and preserves its event", async () => {
	const f = fixture();
	try {
		f.register();
		await f.prepare();
		expect(
			f.runtime.runSync(Effect.flatMap(GuildCleanup, (cleanup) => cleanup.unregister(f.guildId))),
		).toBe(true);
		expect(
			f.runtime.runSync(Effect.flatMap(GuildCleanup, (cleanup) => cleanup.unregister(f.guildId))),
		).toBe(false);
		expect(f.deletedAtEviction).toEqual([true]);
		expect(f.evictions[0]?.slice(0, 2)).toEqual([f.guildId, "GUILD_UNREGISTERED"]);
		expect(f.warn).toHaveBeenCalledWith(
			{
				...discordRefLogFields({ guildId: f.guildId }),
				event: "guild_removed_unregistered",
				evicted: 2,
			},
			"Bot removed from guild; registration deleted",
		);
	} finally {
		await f.close();
	}
});

test("a direct deletion failure rejects, preserves registration and releases the shared guard", async () => {
	const f = fixture();
	let removal: ReturnType<typeof spyOn> | undefined;
	try {
		f.register();
		await f.prepare();
		removal = spyOn(guildRegistry, "unregister").mockImplementationOnce(() => {
			throw new Error("Fixture disk failure");
		});
		await expect(f.run((cleanup) => cleanup.run(unavailable))).rejects.toThrow(
			"Fixture disk failure",
		);
		expect(guildRegistry.getConfig(f.guildId)).toBeDefined();
		expect(f.evictions).toHaveLength(0);
		await f.run((cleanup) => cleanup.run(unavailable));
		expect(f.evictions).toHaveLength(1);
		expect(guildRegistry.getConfig(f.guildId)).toBeUndefined();
	} finally {
		removal?.mockRestore();
		await f.close();
	}
});

test("duplicate ready starts one immediate pass then waits exactly one hour after completion", async () => {
	const f = fixture();
	let scans = 0;
	const client = discord(async () => {
		scans++;
		return null;
	});
	try {
		f.register();
		await f.prepare();
		f.runtime.runSync(Effect.flatMap(GuildCleanup, (cleanup) => cleanup.start(client)));
		f.runtime.runSync(Effect.flatMap(GuildCleanup, (cleanup) => cleanup.start(client)));
		await f.adjust(0);
		expect(scans).toBe(1);
		expect(f.evictions).toHaveLength(1);
		f.register();
		await f.adjust(HOUR - 1);
		expect(scans).toBe(1);
		await f.adjust(1);
		expect(scans).toBe(2);
		expect(f.evictions).toHaveLength(2);
	} finally {
		await f.close();
	}
});

test("a slow notice shifts the next pass to one hour after it finishes, without overlap", async () => {
	const f = fixture();
	let scans = 0;
	try {
		f.register();
		await f.prepare();
		const entered = f.runtime.runSync(Deferred.make<void>());
		const release = f.runtime.runSync(Deferred.make<void>());
		const client = discord(async () => {
			scans++;
			f.runtime.runSync(Deferred.succeed(entered, undefined));
			await f.runtime.runPromise(Deferred.await(release));
			return null;
		});
		f.runtime.runSync(Effect.flatMap(GuildCleanup, (cleanup) => cleanup.start(client)));
		await f.runtime.runPromise(Deferred.await(entered));
		await f.adjust(5 * 60 * 1000);
		await f.run((cleanup) => cleanup.run(client));
		f.runtime.runSync(Effect.flatMap(GuildCleanup, (cleanup) => cleanup.start(client)));
		expect(scans).toBe(1);
		expect(f.evictions).toHaveLength(0);
		f.runtime.runSync(Deferred.succeed(release, undefined));
		await f.adjust(0);
		expect(f.evictions).toHaveLength(1);
		f.register();
		await f.adjust(HOUR - 1);
		expect(scans).toBe(1);
		await f.adjust(1);
		expect(scans).toBe(2);
		expect(f.evictions).toHaveLength(2);
	} finally {
		await f.close();
	}
});

test("scheduled deletion defects log exactly once and retry the next hour", async () => {
	const f = fixture();
	const failure = new Error("Fixture disk failure");
	let removal: ReturnType<typeof spyOn> | undefined;
	try {
		f.register();
		await f.prepare();
		removal = spyOn(guildRegistry, "unregister").mockImplementationOnce(() => {
			throw failure;
		});
		f.runtime.runSync(Effect.flatMap(GuildCleanup, (cleanup) => cleanup.start(unavailable)));
		await f.adjust(0);
		expect(f.error).toHaveBeenCalledTimes(1);
		expect(f.error).toHaveBeenCalledWith(
			{ event: "guild_cleanup_failed", err: failure },
			"Guild cleanup run failed",
		);
		expect(guildRegistry.getConfig(f.guildId)).toBeDefined();
		expect(f.evictions).toHaveLength(0);
		await f.adjust(HOUR);
		expect(removal).toHaveBeenCalledTimes(2);
		expect(f.evictions).toHaveLength(1);
		expect(f.error).toHaveBeenCalledTimes(1);
	} finally {
		removal?.mockRestore();
		await f.close();
	}
});

test("interrupting a direct pass releases its guard and does not resume deletion after a late notice", async () => {
	const f = fixture();
	let release: Deferred.Deferred<void> | undefined;
	try {
		f.register();
		await f.prepare();
		const entered = f.runtime.runSync(Deferred.make<void>());
		release = f.runtime.runSync(Deferred.make<void>());
		const gate = release;
		const fiber = f.runtime.runFork(
			Effect.flatMap(GuildCleanup, (cleanup) =>
				cleanup.run(
					discord(async () => {
						f.runtime.runSync(Deferred.succeed(entered, undefined));
						await f.runtime.runPromise(Deferred.await(gate));
						return null;
					}),
				),
			),
		);
		await f.runtime.runPromise(Deferred.await(entered));
		await f.runtime.runPromise(Fiber.interrupt(fiber));
		expect(f.error).not.toHaveBeenCalled();
		expect(f.evictions).toHaveLength(0);
		f.runtime.runSync(Deferred.succeed(gate, undefined));
		await f.adjust(0);
		expect(f.evictions).toHaveLength(0);
		await f.run((cleanup) => cleanup.run(unavailable));
		expect(f.evictions).toHaveLength(1);
	} finally {
		if (release) f.runtime.runSync(Deferred.succeed(release, undefined));
		await f.close();
	}
});

test("runtime disposal cancels a pending scheduled notice without logging or a later pass", async () => {
	const f = fixture();
	try {
		f.register();
		await f.prepare();
		const entered = f.runtime.runSync(Deferred.make<void>());
		const pending = f.runtime.runSync(Deferred.make<void>());
		let scans = 0;
		f.runtime.runSync(
			Effect.flatMap(GuildCleanup, (cleanup) =>
				cleanup.start(
					discord(async () => {
						scans++;
						f.runtime.runSync(Deferred.succeed(entered, undefined));
						await f.runtime.runPromise(Deferred.await(pending));
						return null;
					}),
				),
			),
		);
		await f.runtime.runPromise(Deferred.await(entered));
		const clock = f.runtime.runSync(TestClock.testClockWith((clock) => Effect.succeed(clock)));
		await f.runtime.dispose();
		await Effect.runPromise(clock.adjust(2 * HOUR));
		expect(scans).toBe(1);
		expect(f.evictions).toHaveLength(0);
		expect(guildRegistry.getConfig(f.guildId)).toBeDefined();
		expect(f.error).not.toHaveBeenCalled();
	} finally {
		await f.close();
	}
});
