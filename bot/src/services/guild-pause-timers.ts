import { Cause, Clock, Context, Effect, FiberMap, Layer } from "effect";
import { expiryDelay, isPausedAt } from "../utils/guild-pause";
import { discordRefLogFields } from "../utils/log-privacy";
import { logger } from "../utils/logger";

export class PauseStore extends Context.Service<
	PauseStore,
	{
		read: (guildId: string) => { paused_until: number | null } | undefined;
		write: (guildId: string, pausedUntil: number | null) => boolean;
		list: () => string[];
	}
>()("memeover/PauseStore") {}

export class PauseBroadcaster extends Context.Service<
	PauseBroadcaster,
	{ send: (guildId: string, pausedUntil: number | null) => void }
>()("memeover/PauseBroadcaster") {}

export class GuildPauseTimers extends Context.Service<
	GuildPauseTimers,
	{
		apply: (guildId: string, pausedUntil: number | null) => Effect.Effect<boolean>;
		rearmAll: Effect.Effect<void>;
	}
>()("memeover/GuildPauseTimers") {
	static readonly layer = Layer.effect(
		GuildPauseTimers,
		Effect.gen(function* () {
			const store = yield* PauseStore;
			const broadcaster = yield* PauseBroadcaster;
			const timers = yield* FiberMap.make<string, void, never>();
			const log = logger.child({ module: "guild-pause" });

			const expire = (guildId: string, initialDelay: number) =>
				Effect.gen(function* () {
					let delay = initialDelay;
					while (true) {
						yield* Effect.sleep(delay);
						const latest = store.read(guildId);
						if (!latest) return;
						const now = yield* Clock.currentTimeMillis;
						if (!isPausedAt(latest, now)) {
							if (store.write(guildId, null)) broadcaster.send(guildId, null);
							return;
						}
						const next = expiryDelay(latest.paused_until ?? now, now);
						if (next === null) return;
						delay = next;
					}
				}).pipe(
					Effect.catchCause((cause) => {
						if (Cause.hasInterrupts(cause)) return Effect.failCause(cause);
						return Effect.sync(() => {
							// Dispatch also checks the timestamp: a failed write cannot prolong the pause.
							log.error(
								{
									...discordRefLogFields({ guildId }),
									event: "pause_expiry_failed",
									err: Cause.squash(cause),
								},
								"Could not clear an expired guild pause",
							);
						});
					}),
				);

			const arm = (guildId: string) =>
				Effect.gen(function* () {
					yield* FiberMap.remove(timers, guildId);
					const cfg = store.read(guildId);
					if (cfg?.paused_until == null) return;
					const delay = expiryDelay(cfg.paused_until, yield* Clock.currentTimeMillis);
					if (delay !== null) yield* FiberMap.run(timers, guildId, expire(guildId, delay));
				});

			return {
				apply: (guildId, pausedUntil) =>
					Effect.gen(function* () {
						if (!store.write(guildId, pausedUntil)) return false;
						broadcaster.send(guildId, pausedUntil);
						yield* arm(guildId);
						return true;
					}),
				rearmAll: Effect.gen(function* () {
					for (const guildId of store.list()) {
						const cfg = store.read(guildId);
						if (cfg?.paused_until != null && !isPausedAt(cfg, yield* Clock.currentTimeMillis))
							store.write(guildId, null);
						yield* arm(guildId);
					}
				}),
			};
		}),
	);
}
