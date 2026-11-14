import { Effect } from "effect";
import { BotRuntime } from "../runtime";
import { GuildPauseTimers } from "../services/guild-pause-timers";

export function applyGuildPause(guildId: string, pausedUntil: number | null): boolean {
	return BotRuntime.runSync(
		Effect.flatMap(GuildPauseTimers, (timers) => timers.apply(guildId, pausedUntil)),
	);
}

export function rearmAllGuildPauses(): void {
	BotRuntime.runSync(Effect.flatMap(GuildPauseTimers, (timers) => timers.rearmAll));
}
