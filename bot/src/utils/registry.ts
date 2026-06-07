import { randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { logger } from "./logger";
import {
	type GuildConfig,
	normalizeRegistry,
	type Registry,
	UNIQUE_CLIENT_ID_LIMIT,
} from "./registry-state";

export type { GuildConfig, Registry } from "./registry-state";

const log = logger.child({ module: "registry" });

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Persistence ──────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "data");
const REGISTRY_FILE = path.join(DATA_DIR, "guilds.json");
const REGISTRY_TMP = path.join(DATA_DIR, "guilds.json.tmp");

let registry: Registry = {};

function generateToken(): string {
	return randomUUID().replace(/-/g, "");
}

function load(): void {
	if (!existsSync(REGISTRY_FILE)) {
		registry = {};
		return;
	}

	try {
		const parsed = JSON.parse(readFileSync(REGISTRY_FILE, "utf-8")) as unknown;
		const normalized = normalizeRegistry(parsed);
		registry = normalized.value;
		if (normalized.changed) save();
	} catch (err) {
		log.error({ event: "registry_load_failed", err }, "Failed to load registry, starting fresh");
		// Unparseable registry — start fresh.
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
		const now = Date.now();

		let channel_ids: string[];
		if (channelId === null) {
			channel_ids = []; // null → all channels allowed
		} else {
			const prev = existing?.channel_ids ?? [];
			channel_ids = prev.includes(channelId) ? prev : [...prev, channelId];
		}

		registry[guildId] = {
			token,
			channel_ids,
			allow_bot_app_sources: existing?.allow_bot_app_sources ?? false,
			registered_at: existing?.registered_at ?? now,
			last_active_at: existing?.last_active_at ?? null,
			unique_client_ids: existing?.unique_client_ids ?? [],
		};
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

	setBotAppSources(guildId: string, enabled: boolean): GuildConfig | null {
		const existing = registry[guildId];
		if (!existing) return null;
		const next = { ...existing, allow_bot_app_sources: enabled };
		registry[guildId] = next;
		save();
		return {
			...next,
			channel_ids: [...next.channel_ids],
			unique_client_ids: [...next.unique_client_ids],
		};
	},

	recordClientActivity(guildId: string, clientId: string): void {
		const existing = registry[guildId];
		if (!existing) return;

		const unique_client_ids =
			existing.unique_client_ids.includes(clientId) ||
			existing.unique_client_ids.length >= UNIQUE_CLIENT_ID_LIMIT
				? existing.unique_client_ids
				: [...existing.unique_client_ids, clientId];

		registry[guildId] = {
			...existing,
			last_active_at: Date.now(),
			unique_client_ids,
		};
		save();
	},

	recordGuildActivity(guildId: string): void {
		const existing = registry[guildId];
		if (!existing) return;
		registry[guildId] = { ...existing, last_active_at: Date.now() };
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

	getRegisteredCount(): number {
		return Object.keys(registry).length;
	},

	getRegisteredGuilds(): Array<[string, GuildConfig]> {
		return Object.entries(registry).map(([guildId, cfg]) => [
			guildId,
			{
				...cfg,
				channel_ids: [...cfg.channel_ids],
				unique_client_ids: [...cfg.unique_client_ids],
			},
		]);
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
