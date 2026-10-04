import type { DiagMessage } from "@memeover/shared";
import type { GuildConfig } from "../utils/registry-state";
export interface GuildDiagFacts {
	guildId: string;
	cfg: GuildConfig | undefined;
	overlaysConnected: number;
	clientId: string;
	intent: boolean | null;
	channels: { id: string; name: string | null; view: boolean; history: boolean }[];
	unviewableCount: number | null;
}
export function buildGuildDiag(input: GuildDiagFacts): DiagMessage {
	return {
		type: "DIAG",
		guild_id: input.guildId,
		registered: input.cfg !== undefined,
		all_channels: input.cfg?.channel_ids.length === 0,
		channels: [...input.channels]
			.sort(
				(a, b) =>
					Number(a.name === null) - Number(b.name === null) ||
					(a.name ?? "").localeCompare(b.name ?? "") ||
					a.id.localeCompare(b.id),
			)
			.slice(0, 25)
			.map((c) => ({
				id: c.id,
				name: c.name,
				missing: c.name === null,
				perms: { view: c.view, history: c.history },
			})),
		unviewable_channel_count: input.unviewableCount,
		allow_bot_app_sources: input.cfg?.allow_bot_app_sources ?? false,
		message_content_intent: input.intent,
		overlays_connected: input.overlaysConnected,
		client_id: input.clientId,
		paused_until: input.cfg?.paused_until ?? null,
	};
}
export function createCooldown(ms: number, now: () => number = Date.now) {
	const taken = new Map<string, number>();
	return {
		tryTake(key: string): boolean {
			const time = now(),
				previous = taken.get(key);
			if (previous !== undefined && time - previous < ms) return false;
			taken.set(key, time);
			return true;
		},
		forget(key: string): void {
			taken.delete(key);
		},
	};
}
