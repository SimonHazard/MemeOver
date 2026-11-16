import type { Client } from "discord.js";
import { Effect } from "effect";
import { BotRuntime } from "../runtime";
import {
	GuildCleanup,
	runGuildCleanupPass,
	unregisterRemovedGuild as unregister,
} from "../services/guild-cleanup";

export { cleanupReason } from "../services/guild-cleanup";

export function runGuildCleanup(client: Client, scanAt?: number): Promise<void> {
	return BotRuntime.runPromise(runGuildCleanupPass(client, scanAt));
}

export function unregisterRemovedGuild(guildId: string): boolean {
	return BotRuntime.runSync(unregister(guildId));
}

export function startGuildCleanupScheduler(client: Client): void {
	BotRuntime.runSync(Effect.flatMap(GuildCleanup, (cleanup) => cleanup.start(client)));
}
