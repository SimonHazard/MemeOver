import { randomUUID, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { logger } from "./logger";
import {
	deleteGuild,
	importLegacyRegistry,
	openRegistryDatabase,
	readRegistry,
	writeGuild,
} from "./registry-db";
import { type GuildConfig, type Registry, UNIQUE_CLIENT_ID_LIMIT } from "./registry-state";

export type { GuildConfig, Registry } from "./registry-state";

const log = logger.child({ module: "registry" });

// ─── Persistence ──────────────────────────────────────────────────────────────

const DATA_DIR = process.env.MEMEOVER_DATA_DIR || path.join(process.cwd(), "data");
const REGISTRY_DB = "memeover.db";
const LEGACY_REGISTRY_FILE = "guilds.json";

function generateToken(): string {
	return randomUUID().replace(/-/g, "");
}

// ─── API ──────────────────────────────────────────────────────────────────────

/**
 * Reads are served from memory (isChannelAllowed runs for every Discord message of every guild);
 * every change is written to SQLite before memory, so memory never holds a refused write.
 */
export function createGuildRegistry(dataDir: string) {
	mkdirSync(dataDir, { recursive: true });
	const db = openRegistryDatabase(path.join(dataDir, REGISTRY_DB));

	let registry: Registry;
	try {
		const imported = importLegacyRegistry(db, path.join(dataDir, LEGACY_REGISTRY_FILE));
		if (imported !== null) {
			log.info(
				{ event: "registry_legacy_imported", guilds: imported },
				"Imported guilds.json into the SQLite registry",
			);
		}
		registry = readRegistry(db);
	} catch (err) {
		db.close();
		throw err;
	}

	function commit(guildId: string, cfg: GuildConfig): void {
		writeGuild(db, guildId, cfg);
		registry[guildId] = cfg;
	}

	return {
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

			commit(guildId, {
				token,
				paused_until: existing?.paused_until ?? null,
				channel_ids,
				allow_bot_app_sources: existing?.allow_bot_app_sources ?? false,
				registered_at: existing?.registered_at ?? now,
				last_active_at: existing?.last_active_at ?? null,
				unique_client_ids: existing?.unique_client_ids ?? [],
			});
			return token;
		},

		/** Reset to watching ALL channels without changing the token. */
		clearChannels(guildId: string): void {
			const existing = registry[guildId];
			if (!existing) return;
			commit(guildId, { ...existing, channel_ids: [] });
		},

		setPausedUntil(guildId: string, pausedUntil: number | null): GuildConfig | null {
			const cfg = registry[guildId];
			if (!cfg) return null;
			const next = { ...cfg, paused_until: pausedUntil };
			commit(guildId, next);
			return next;
		},
		setBotAppSources(guildId: string, enabled: boolean): GuildConfig | null {
			const existing = registry[guildId];
			if (!existing) return null;
			const next = { ...existing, allow_bot_app_sources: enabled };
			commit(guildId, next);
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

			commit(guildId, {
				...existing,
				last_active_at: Date.now(),
				unique_client_ids,
			});
		},

		recordGuildActivity(guildId: string): void {
			const existing = registry[guildId];
			if (!existing) return;
			commit(guildId, { ...existing, last_active_at: Date.now() });
		},

		/**
		 * Generate a new token for an existing guild, invalidating the previous one.
		 * Callers must revoke connected sessions with evictGuild immediately after rotation.
		 * Returns the new token, or null if the guild is not registered.
		 */
		rotateToken(guildId: string): string | null {
			const existing = registry[guildId];
			if (!existing) return null;
			const token = generateToken();
			commit(guildId, { ...existing, token });
			return token;
		},

		unregister(guildId: string): void {
			deleteGuild(db, guildId);
			delete registry[guildId];
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

		/**
		 * Fold the WAL back into the database file (graceful shutdown). Every write is already
		 * durable; the connection stays open for close handlers that still record activity.
		 */
		flush(): void {
			db.run("PRAGMA wal_checkpoint(TRUNCATE)");
		},

		close(): void {
			db.close();
		},
	};
}

export type GuildRegistry = ReturnType<typeof createGuildRegistry>;

export const guildRegistry = createGuildRegistry(DATA_DIR);
