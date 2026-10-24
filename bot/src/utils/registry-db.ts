import { Database } from "bun:sqlite";
import { existsSync, readFileSync, renameSync } from "node:fs";
import { logger } from "./logger";
import { type GuildConfig, normalizeRegistry, type Registry } from "./registry-state";

const log = logger.child({ module: "registry" });

/** Bump together with a new step in `migrate` whenever the table shape changes. */
const SCHEMA_VERSION = 2;

interface GuildRow {
	guild_id: string;
	token: string;
	paused_until: number | null;
	channel_ids: string;
	allow_bot_app_sources: number;
	registered_at: number;
	last_active_at: number | null;
	unique_client_ids: string;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

function migrate(db: Database): void {
	const version =
		db.query<{ user_version: number }, []>("PRAGMA user_version").get()?.user_version ?? 0;
	if (version > SCHEMA_VERSION) {
		throw new Error(
			`Registry database schema v${version} is newer than this bot supports (v${SCHEMA_VERSION})`,
		);
	}

	db.transaction(() => {
		if (version < 1) {
			// Arrays stay JSON: they are tiny and always read and written with their guild.
			db.run(`
				CREATE TABLE guilds (
					guild_id TEXT PRIMARY KEY,
					token TEXT NOT NULL,
					paused_until INTEGER,
					channel_ids TEXT NOT NULL,
					allow_bot_app_sources INTEGER NOT NULL CHECK (allow_bot_app_sources IN (0, 1)),
					registered_at INTEGER NOT NULL,
					last_active_at INTEGER,
					unique_client_ids TEXT NOT NULL
				) STRICT
			`);
		}
		if (version < 2) {
			db.run("CREATE TABLE registry_migrations (name TEXT PRIMARY KEY) STRICT");
		}
		db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`);
	})();
}

/**
 * WAL keeps the file consistent through crashes and power loss; FULL syncs every commit, which
 * costs nothing at the registry's write rate (joins, disconnects and slash commands).
 */
export function openRegistryDatabase(file: string): Database {
	const db = new Database(file, { create: true, strict: true });
	try {
		db.run("PRAGMA journal_mode = WAL");
		db.run("PRAGMA synchronous = FULL");
		migrate(db);
		return db;
	} catch (err) {
		db.close();
		throw err;
	}
}

// ─── Rows ─────────────────────────────────────────────────────────────────────

function parseJson(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

/** Rows go through the same normalization as the legacy JSON file. */
export function readRegistry(db: Database): Registry {
	const raw: Record<string, unknown> = {};
	for (const row of db.query<GuildRow, []>("SELECT * FROM guilds").all()) {
		raw[row.guild_id] = {
			token: row.token,
			paused_until: row.paused_until,
			channel_ids: parseJson(row.channel_ids),
			allow_bot_app_sources: row.allow_bot_app_sources === 1,
			registered_at: row.registered_at,
			last_active_at: row.last_active_at,
			unique_client_ids: parseJson(row.unique_client_ids),
		};
	}
	return normalizeRegistry(raw).value;
}

export function writeGuild(db: Database, guildId: string, cfg: GuildConfig): void {
	db.query(`
		INSERT OR REPLACE INTO guilds (
			guild_id, token, paused_until, channel_ids, allow_bot_app_sources,
			registered_at, last_active_at, unique_client_ids
		) VALUES (
			$guild_id, $token, $paused_until, $channel_ids, $allow_bot_app_sources,
			$registered_at, $last_active_at, $unique_client_ids
		)
	`).run({
		guild_id: guildId,
		token: cfg.token,
		paused_until: cfg.paused_until,
		channel_ids: JSON.stringify(cfg.channel_ids),
		allow_bot_app_sources: cfg.allow_bot_app_sources ? 1 : 0,
		registered_at: cfg.registered_at,
		last_active_at: cfg.last_active_at,
		unique_client_ids: JSON.stringify(cfg.unique_client_ids),
	});
}

export function deleteGuild(db: Database, guildId: string): void {
	db.query("DELETE FROM guilds WHERE guild_id = $guild_id").run({ guild_id: guildId });
}

// ─── Legacy import ────────────────────────────────────────────────────────────

/**
 * Check for the pre-SQLite `guilds.json` once, then leave SQLite authoritative even when empty.
 * The marker commits with the imported rows, before the best-effort rename to `.migrated`.
 * Unreadable JSON throws and rolls back, so a repaired file can be imported on the next start.
 * Returns the number of imported guilds, or null when there was nothing to import.
 */
export function importLegacyRegistry(db: Database, legacyFile: string): number | null {
	const legacyExists = existsSync(legacyFile);
	const imported = db
		.transaction(() => {
			if (db.query("SELECT name FROM registry_migrations WHERE name = 'legacy_json'").get()) {
				return null;
			}

			const rows = db.query<{ count: number }, []>("SELECT COUNT(*) AS count FROM guilds").get();
			let count: number | null = null;
			if (legacyExists && (rows?.count ?? 0) === 0) {
				const legacy = normalizeRegistry(JSON.parse(readFileSync(legacyFile, "utf-8"))).value;
				for (const [guildId, cfg] of Object.entries(legacy)) writeGuild(db, guildId, cfg);
				count = Object.keys(legacy).length;
			}

			db.run("INSERT INTO registry_migrations (name) VALUES ('legacy_json')");
			return count;
		})
		.immediate();

	if (imported === null) {
		if (legacyExists) {
			log.warn(
				{ event: "registry_legacy_ignored" },
				"Legacy guilds.json ignored: the SQLite registry is already initialized",
			);
		}
		return null;
	}

	try {
		renameSync(legacyFile, `${legacyFile}.migrated`);
	} catch (err) {
		log.warn(
			{ event: "registry_legacy_rename_failed", err },
			"Imported guilds.json but could not rename it",
		);
	}
	return imported;
}
