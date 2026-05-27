import { randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { logger } from "./logger";

const log = logger.child({ module: "registry" });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GuildConfig {
	token: string;
	/** Empty channel_ids = all channels allowed */
	channel_ids: string[];
	registered_at: number;
	last_active_at: number | null;
	/** At most two opaque app install ids; two is enough to prove the guild is not single-user. */
	unique_client_ids: string[];
}

type Registry = Record<string, GuildConfig>;

// ─── Persistence ──────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "data");
const REGISTRY_FILE = path.join(DATA_DIR, "guilds.json");
const REGISTRY_TMP = path.join(DATA_DIR, "guilds.json.tmp");

let registry: Registry = {};

const UNIQUE_CLIENT_ID_LIMIT = 2;

function generateToken(): string {
	return randomUUID().replace(/-/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOrNull(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeConfig(raw: unknown, now: number): GuildConfig | null {
	if (!isRecord(raw) || typeof raw.token !== "string") return null;

	const channel_ids = Array.isArray(raw.channel_ids)
		? raw.channel_ids.filter((id): id is string => typeof id === "string")
		: [];
	const unique_client_ids = Array.isArray(raw.unique_client_ids)
		? raw.unique_client_ids
				.filter((id): id is string => typeof id === "string" && id.length > 0)
				.slice(0, UNIQUE_CLIENT_ID_LIMIT)
		: [];

	return {
		token: raw.token,
		channel_ids,
		registered_at: numberOrNull(raw.registered_at) ?? now,
		last_active_at: numberOrNull(raw.last_active_at),
		unique_client_ids,
	};
}

function normalizeRegistry(raw: unknown): { value: Registry; changed: boolean } {
	const now = Date.now();
	if (!isRecord(raw)) return { value: {}, changed: true };

	const value: Registry = {};
	let changed = false;

	for (const [guildId, rawConfig] of Object.entries(raw)) {
		const config = normalizeConfig(rawConfig, now);
		if (!config) {
			changed = true;
			continue;
		}
		value[guildId] = config;

		if (
			!isRecord(rawConfig) ||
			!Array.isArray(rawConfig.channel_ids) ||
			rawConfig.channel_ids.some((id) => typeof id !== "string") ||
			numberOrNull(rawConfig.registered_at) === null ||
			!("last_active_at" in rawConfig) ||
			(rawConfig.last_active_at !== null && numberOrNull(rawConfig.last_active_at) === null) ||
			!Array.isArray(rawConfig.unique_client_ids) ||
			rawConfig.unique_client_ids.length > UNIQUE_CLIENT_ID_LIMIT ||
			rawConfig.unique_client_ids.some((id) => typeof id !== "string" || id.length === 0)
		) {
			changed = true;
		}
	}

	return { value, changed };
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
