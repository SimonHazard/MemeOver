import { broadcastToGuild } from "../server";
import { expiryDelay, isPausedAt } from "./guild-pause";
import { discordRefLogFields } from "./log-privacy";
import { logger } from "./logger";
import { guildRegistry } from "./registry";

const log = logger.child({ module: "guild-pause" });

const timers = new Map<string, ReturnType<typeof setTimeout>>();
function arm(guildId: string) {
	const previous = timers.get(guildId);
	if (previous) clearTimeout(previous);
	timers.delete(guildId);
	const cfg = guildRegistry.getConfig(guildId);
	if (!cfg || cfg.paused_until === null) return;
	const delay = expiryDelay(cfg.paused_until, Date.now());
	if (delay === null) return;
	const timer = setTimeout(() => {
		timers.delete(guildId);
		try {
			const latest = guildRegistry.getConfig(guildId);
			if (!latest) return;
			if (isPausedAt(latest, Date.now())) arm(guildId);
			else applyGuildPause(guildId, null);
		} catch (err) {
			// Dispatch checks the expiry against the clock, so this pause is already over.
			log.error(
				{ ...discordRefLogFields({ guildId }), event: "pause_expiry_failed", err },
				"Could not clear an expired guild pause",
			);
		}
	}, delay);
	timer.unref();
	timers.set(guildId, timer);
}
export function applyGuildPause(guildId: string, pausedUntil: number | null): boolean {
	if (!guildRegistry.setPausedUntil(guildId, pausedUntil)) return false;
	broadcastToGuild(guildId, { type: "GUILD_STATE", guild_id: guildId, paused_until: pausedUntil });
	arm(guildId);
	return true;
}
export function rearmAllGuildPauses() {
	for (const [guildId] of guildRegistry.getRegisteredGuilds()) {
		const cfg = guildRegistry.getConfig(guildId);
		if (cfg?.paused_until != null && !isPausedAt(cfg, Date.now()))
			guildRegistry.setPausedUntil(guildId, null);
		arm(guildId);
	}
}
