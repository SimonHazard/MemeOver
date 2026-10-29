import type { EventSource } from "@memeover/shared";
import { isPausedAt } from "../utils/guild-pause";
import type { GuildConfig } from "../utils/registry";

export type AdmissionVerdict = "ok" | "channel_not_watched" | "paused" | "source_blocked";

/** Decide whether an event may reach the guild room. Slash commands skip source policy. */
export function admitGuildEvent(input: {
	channelAllowed: boolean;
	config: GuildConfig | null | undefined;
	source: EventSource;
	now: number;
	enforceSourcePolicy: boolean;
}): AdmissionVerdict {
	if (!input.channelAllowed) return "channel_not_watched";
	if (isPausedAt(input.config ?? undefined, input.now)) return "paused";
	if (
		input.enforceSourcePolicy &&
		input.source === "bot_app" &&
		!input.config?.allow_bot_app_sources
	) {
		return "source_blocked";
	}
	return "ok";
}
