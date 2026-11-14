import { Layer, ManagedRuntime } from "effect";
import { broadcastToGuild } from "./server";
import { GuildPauseTimers, PauseBroadcaster, PauseStore } from "./services/guild-pause-timers";
import { Heartbeats } from "./services/heartbeats";
import { guildRegistry } from "./utils/registry";

const PauseStoreLive = Layer.succeed(PauseStore, {
	read: (guildId) => guildRegistry.getConfig(guildId),
	write: (guildId, pausedUntil) => Boolean(guildRegistry.setPausedUntil(guildId, pausedUntil)),
	list: () => guildRegistry.getRegisteredGuilds().map(([guildId]) => guildId),
});
const PauseBroadcasterLive = Layer.succeed(PauseBroadcaster, {
	send: (guildId, pausedUntil) =>
		broadcastToGuild(guildId, {
			type: "GUILD_STATE",
			guild_id: guildId,
			paused_until: pausedUntil,
		}),
});

export const BotLive = Layer.mergeAll(
	GuildPauseTimers.layer.pipe(Layer.provide(Layer.mergeAll(PauseStoreLive, PauseBroadcasterLive))),
	Heartbeats.layer,
);

// Construction is lazy; synchronous facades share this one owned service graph.
export const BotRuntime = ManagedRuntime.make(BotLive);
