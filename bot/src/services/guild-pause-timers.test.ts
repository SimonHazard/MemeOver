import { expect, spyOn, test } from "bun:test";
import { Clock, Effect, Layer, ManagedRuntime } from "effect";
import { TestClock } from "effect/testing";
import { isPausedAt, MAX_TIMER_MS, PAUSE_INDEFINITE } from "../utils/guild-pause";
import { discordRefLogFields } from "../utils/log-privacy";
import { logger } from "../utils/logger";
import { GuildPauseTimers, PauseBroadcaster, PauseStore } from "./guild-pause-timers";

function fixture(initial: Record<string, number | null> = { guild: null }) {
	const rows = new Map(Object.entries(initial).map(([id, paused_until]) => [id, { paused_until }]));
	const events: Array<[string, number | null]> = [];
	const writes: Array<[string, number | null]> = [];
	const failures = new Set<string>();
	const diskError = new Error("Fixture disk failure");
	const adapters = Layer.mergeAll(
		Layer.succeed(PauseStore, {
			read: (id) => rows.get(id),
			write: (id, until) => {
				writes.push([id, until]);
				if (failures.has(id)) throw diskError;
				if (!rows.has(id)) return false;
				rows.set(id, { paused_until: until });
				return true;
			},
			list: () => [...rows.keys()],
		}),
		Layer.succeed(PauseBroadcaster, { send: (id, until) => void events.push([id, until]) }),
	);
	const layer = GuildPauseTimers.layer.pipe(Layer.provide(adapters));
	const run = <A>(body: (timers: GuildPauseTimers["Service"]) => Effect.Effect<A>) =>
		Effect.runPromise(
			Effect.flatMap(GuildPauseTimers, body).pipe(
				Effect.provide(layer),
				Effect.provide(TestClock.layer()),
			),
		);
	return { rows, events, writes, failures, diskError, layer, run };
}

test("a timed pause expires exactly once at 15 minutes, after its successful write", async () => {
	const f = fixture();
	await f.run((timers) =>
		Effect.gen(function* () {
			expect(yield* timers.apply("guild", 900_000)).toBe(true);
			expect(f.rows.get("guild")?.paused_until).toBe(900_000);
			expect(f.events).toEqual([["guild", 900_000]]);
			// FiberMap.run starts the job immediately: the sleep is registered before apply returns.
			yield* TestClock.adjust("14 minutes");
			expect(f.events).toHaveLength(1);
			yield* TestClock.adjust("1 minute");
			expect(f.rows.get("guild")?.paused_until).toBeNull();
			expect(f.events).toEqual([
				["guild", 900_000],
				["guild", null],
			]);
			yield* TestClock.adjust("1 hour");
			expect(f.events).toHaveLength(2);
		}),
	);
});

test("unknown guilds do not broadcast and removal prevents a late expiry", async () => {
	const f = fixture();
	await f.run((timers) =>
		Effect.gen(function* () {
			expect(yield* timers.apply("unknown", 100)).toBe(false);
			expect(f.events).toEqual([]);
			yield* timers.apply("guild", 100);
			f.rows.delete("guild");
			yield* TestClock.adjust(100);
			expect(f.events).toEqual([["guild", 100]]);
		}),
	);
});

test("indefinite replacement and explicit resume cancel the previous timer", async () => {
	const f = fixture();
	await f.run((timers) =>
		Effect.gen(function* () {
			yield* timers.apply("guild", 100);
			yield* timers.apply("guild", PAUSE_INDEFINITE);
			yield* TestClock.adjust(1000);
			expect(f.rows.get("guild")?.paused_until).toBe(PAUSE_INDEFINITE);
			expect(f.events).toHaveLength(2);
			yield* timers.apply("guild", 2000);
			yield* timers.apply("guild", null);
			yield* TestClock.adjust(2000);
			expect(f.events).toEqual([
				["guild", 100],
				["guild", PAUSE_INDEFINITE],
				["guild", 2000],
				["guild", null],
			]);
		}),
	);
});

test("a moved deadline is re-read without replacing the current expiry fiber", async () => {
	const f = fixture();
	await f.run((timers) =>
		Effect.gen(function* () {
			yield* timers.apply("guild", 100);
			f.rows.set("guild", { paused_until: 300 });
			yield* TestClock.adjust(100);
			expect(f.events).toHaveLength(1);
			yield* TestClock.adjust(199);
			expect(f.events).toHaveLength(1);
			yield* TestClock.adjust(1);
			expect(f.events).toEqual([
				["guild", 100],
				["guild", null],
			]);
		}),
	);
});

test("clamped delays do not expire early and the shared indefinite sentinel is never scheduled", async () => {
	const f = fixture({ guild: null, indefinite: null });
	await f.run((timers) =>
		Effect.gen(function* () {
			yield* timers.apply("guild", MAX_TIMER_MS + 500);
			yield* timers.apply("indefinite", PAUSE_INDEFINITE);
			yield* TestClock.adjust(MAX_TIMER_MS);
			expect(f.events).toHaveLength(2);
			yield* TestClock.adjust(499);
			expect(f.events).toHaveLength(2);
			yield* TestClock.adjust(1);
			expect(f.events[f.events.length - 1]).toEqual(["guild", null]);
			expect(f.rows.get("indefinite")?.paused_until).toBe(PAUSE_INDEFINITE);
		}),
	);
});

test("startup silently clears stale values and rearms only future deadlines", async () => {
	const f = fixture({ stale: -1, future: 100, indefinite: PAUSE_INDEFINITE, resumed: null });
	await f.run((timers) =>
		Effect.gen(function* () {
			yield* timers.rearmAll;
			expect(f.rows.get("stale")?.paused_until).toBeNull();
			expect(f.events).toEqual([]);
			yield* TestClock.adjust(100);
			expect(f.events).toEqual([["future", null]]);
		}),
	);
});

test("an expiry write defect is logged once with safe metadata, and other guilds still expire", async () => {
	const f = fixture({ guild: null, other: null });
	const child = logger.child<string>({ module: "guild-pause" });
	const childSpy = spyOn(logger, "child").mockReturnValue(child);
	const errorSpy = spyOn(child, "error").mockImplementation(() => {});
	try {
		await f.run((timers) =>
			Effect.gen(function* () {
				yield* timers.apply("guild", 100);
				yield* timers.apply("other", 200);
				f.failures.add("guild");
				yield* TestClock.adjust(100);
				expect(errorSpy).toHaveBeenCalledTimes(1);
				expect(errorSpy).toHaveBeenCalledWith(
					{
						...discordRefLogFields({ guildId: "guild" }),
						event: "pause_expiry_failed",
						err: f.diskError,
					},
					"Could not clear an expired guild pause",
				);
				expect(isPausedAt(f.rows.get("guild"), yield* Clock.currentTimeMillis)).toBe(false);
				expect(f.events).toEqual([
					["guild", 100],
					["other", 200],
				]);
				yield* TestClock.adjust(1000);
				expect(f.events[f.events.length - 1]).toEqual(["other", null]);
				expect(errorSpy).toHaveBeenCalledTimes(1);
			}),
		);
	} finally {
		errorSpy.mockRestore();
		childSpy.mockRestore();
	}
});

test("explicit write failures are synchronous and leave the previous timer intact", async () => {
	const f = fixture();
	await f.run((timers) =>
		Effect.gen(function* () {
			yield* timers.apply("guild", 100);
			f.failures.add("guild");
			const result = yield* Effect.exit(timers.apply("guild", 500));
			expect(result._tag).toBe("Failure");
			expect(f.events).toEqual([["guild", 100]]);
			f.failures.clear();
			yield* TestClock.adjust(100);
			expect(f.events).toEqual([
				["guild", 100],
				["guild", null],
			]);
		}),
	);
	const runtime = ManagedRuntime.make(f.layer);
	try {
		f.failures.add("guild");
		expect(() =>
			runtime.runSync(Effect.flatMap(GuildPauseTimers, (t) => t.apply("guild", null))),
		).toThrow("Fixture disk failure");
		f.rows.set("guild", { paused_until: -1 });
		expect(() => runtime.runSync(Effect.flatMap(GuildPauseTimers, (t) => t.rearmAll))).toThrow(
			"Fixture disk failure",
		);
	} finally {
		await runtime.dispose();
	}
});

test("repeated runSync builds, replaces and cancels synchronously; disposal cancels owned jobs", async () => {
	const f = fixture();
	const runtime = ManagedRuntime.make(f.layer.pipe(Layer.provideMerge(TestClock.layer())));
	const child = logger.child<string>({ module: "guild-pause" });
	const childSpy = spyOn(logger, "child").mockReturnValue(child);
	const errorSpy = spyOn(child, "error").mockImplementation(() => {});
	try {
		for (const until of [100, 200, PAUSE_INDEFINITE, null, 300]) {
			expect(
				runtime.runSync(Effect.flatMap(GuildPauseTimers, (t) => t.apply("guild", until))),
			).toBe(true);
		}
		runtime.runSync(Effect.flatMap(GuildPauseTimers, (t) => t.rearmAll));
		const clock = runtime.runSync(TestClock.testClockWith((clock) => Effect.succeed(clock)));
		const count = f.events.length;
		await runtime.dispose();
		await Effect.runPromise(clock.adjust(1000));
		expect(f.events).toHaveLength(count);
		expect(f.rows.get("guild")?.paused_until).toBe(300);
		expect(errorSpy).not.toHaveBeenCalled();
	} finally {
		await runtime.dispose();
		errorSpy.mockRestore();
		childSpy.mockRestore();
	}
});
