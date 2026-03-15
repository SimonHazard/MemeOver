import { randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { logger } from "./logger";

const log = logger.child({ module: "registry" });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GuildConfig {
	token: string;
	/** Empty channel_ids = all channels allowed */
	channel_ids: string[];
}

type Registry = Record<string, GuildConfig>;

// ─── Persistence ──────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "data");
const REGISTRY_FILE = path.join(DATA_DIR, "guilds.json");
const REGISTRY_TMP = path.join(DATA_DIR, "guilds.json.tmp");

let registry: Registry = {};

function generateToken(): string {
	return randomUUID().replace(/-/g, "");
}

function load(): void {
	try {
		registry = JSON.parse(readFileSync(REGISTRY_FILE, "utf-8")) as Registry;
	} catch (err) {
		log.error({ event: "registry_load_failed", err }, "Failed to load registry, starting fresh");
		// File not found (first run) or unparseable — start fresh
		registry = {};
	}
}

/** Atomic write: write to .tmp then rename (POSIX-atomic). */
function save(): void {
	writeFileSync(REGISTRY_TMP, JSON.stringify(registry, null, 2), "utf-8");
	renameSync(REGISTRY_TMP, REGISTRY_FILE);
}

// Ensure data dir exists and load persisted registry at module init
mkdirSync(DATA_DIR, { recursive: true });
load();

// ─── API ──────────────────────────────────────────────────────────────────────

export const guildRegistry = {
	/**
	 * Register or update a guild.
	 * - channelId = null  → watch ALL channels (channel_ids: [])
	 * - channelId = string → ADD to the existing list (idempotent, never replaces)
	 * Keeps the existing token so active WebSocket sessions are not invalidated.
	 * Returns the (existing or new) token.
	 */
	register(guildId: string, channelId: string | null): string {
		const existing = registry[guildId];
		const token = existing?.token ?? generateToken();

		let channel_ids: string[];
		if (channelId === null) {
			channel_ids = []; // null → all channels allowed
		} else {
			const prev = existing?.channel_ids ?? [];
			channel_ids = prev.includes(channelId) ? prev : [...prev, channelId];
		}

		registry[guildId] = { token, channel_ids };
		save();
		return token;
	},

	/** Reset to watching ALL channels without changing the token. */
	clearChannels(guildId: string): void {
		const existing = registry[guildId];
		if (!existing) return;
		registry[guildId] = { ...existing, channel_ids: [] };
		save();
	},

	/**
	 * Generate a new token for an existing guild, invalidating the previous one.
	 * All currently connected WebSocket clients will fail their next auth check
	 * and must reconnect with the new token.
	 * Returns the new token, or null if the guild is not registered.
	 */
	rotateToken(guildId: string): string | null {
		const existing = registry[guildId];
		if (!existing) return null;
		const token = generateToken();
		registry[guildId] = { ...existing, token };
		save();
		return token;
	},

	unregister(guildId: string): void {
		delete registry[guildId];
		save();
	},

	getConfig(guildId: string): GuildConfig | undefined {
		return registry[guildId];
	},

	verifyToken(guildId: string, token: string): boolean {
		const stored = registry[guildId]?.token;
		if (!stored) return false;
		if (stored.length !== token.length) return false;
		return timingSafeEqual(Buffer.from(stored), Buffer.from(token));
	},

	isChannelAllowed(guildId: string, channelId: string): boolean {
		const cfg = registry[guildId];
		if (!cfg) return false;
		if (cfg.channel_ids.length === 0) return true;
		return cfg.channel_ids.includes(channelId);
	},

	isRegistered(guildId: string): boolean {
		return guildId in registry;
	},

	/** Explicitly flush registry to disk (used by graceful shutdown). */
	flush(): void {
		save();
	},
};
