import { Database } from "bun:sqlite";
import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGuildRegistry, type GuildRegistry, guildRegistry } from "./registry";
import { importLegacyRegistry, openRegistryDatabase } from "./registry-db";

const ids: string[] = [];
function guild() {
	const id = String(BigInt(`0x${crypto.randomUUID().replaceAll("-", "").slice(0, 14)}`)).padStart(
		18,
		"1",
	);
	ids.push(id);
	return id;
}
afterEach(() => {
	for (const id of ids) guildRegistry.unregister(id);
	ids.length = 0;
	setSystemTime();
});
test("register all channels with 32 hex token", () => {
	const g = guild();
	expect(guildRegistry.register(g, null)).toMatch(/^[a-f0-9]{32}$/);
	expect(guildRegistry.getConfig(g)?.channel_ids).toEqual([]);
});
test("channel additions idempotent and token preserved", () => {
	const g = guild(),
		token = guildRegistry.register(g, "c1");
	expect(guildRegistry.register(g, "c2")).toBe(token);
	guildRegistry.register(g, "c1");
	expect(guildRegistry.getConfig(g)?.channel_ids).toEqual(["c1", "c2"]);
	expect(guildRegistry.register(g, null)).toBe(token);
	expect(guildRegistry.getConfig(g)?.channel_ids).toEqual([]);
});
test("register preserves source setting and registration", () => {
	const g = guild();
	guildRegistry.register(g, null);
	const initial = guildRegistry.getConfig(g)?.registered_at;
	guildRegistry.setBotAppSources(g, true);
	guildRegistry.register(g, "c");
	expect(guildRegistry.getConfig(g)).toMatchObject({
		allow_bot_app_sources: true,
		registered_at: initial,
	});
});
test("activity records at most two distinct installs", () => {
	const g = guild();
	guildRegistry.register(g, null);
	for (const [i, id] of ["a", "a", "b", "c"].entries()) {
		setSystemTime(10000 + i);
		guildRegistry.recordClientActivity(g, id);
		expect(guildRegistry.getConfig(g)?.last_active_at).toBe(10000 + i);
	}
	expect(guildRegistry.getConfig(g)?.unique_client_ids).toEqual(["a", "b"]);
});
test("unknown guild activity ignored", () => {
	const g = guild();
	guildRegistry.recordClientActivity(g, "a");
	expect(guildRegistry.getConfig(g)).toBeUndefined();
});
test("rotation revokes old token", () => {
	const g = guild(),
		old = guildRegistry.register(g, null),
		next = guildRegistry.rotateToken(g);
	expect(next).not.toBe(old);
	expect(guildRegistry.verifyToken(g, old)).toBe(false);
	expect(guildRegistry.verifyToken(g, next ?? "")).toBe(true);
	expect(guildRegistry.verifyToken(g, "short")).toBe(false);
});
test("unknown token lookup and rotation", () => {
	const g = guild();
	expect(guildRegistry.rotateToken(g)).toBeNull();
	expect(guildRegistry.verifyToken(g, "x")).toBe(false);
});
test("channel allowlist", () => {
	const g = guild();
	expect(guildRegistry.isChannelAllowed(g, "c")).toBe(false);
	guildRegistry.register(g, "c");
	expect(guildRegistry.isChannelAllowed(g, "c")).toBe(true);
	expect(guildRegistry.isChannelAllowed(g, "other")).toBe(false);
	guildRegistry.register(g, null);
	expect(guildRegistry.isChannelAllowed(g, "other")).toBe(true);
});
test("unregister removes configuration", () => {
	const g = guild();
	guildRegistry.register(g, null);
	guildRegistry.unregister(g);
	expect(guildRegistry.isRegistered(g)).toBe(false);
	expect(guildRegistry.getConfig(g)).toBeUndefined();
});
test("registry persists to SQLite in test directory", () => {
	const g = guild();
	guildRegistry.register(g, null);
	const root = process.env.MEMEOVER_DATA_DIR;
	if (!root) throw new Error("Missing test data dir");
	expect(root).toContain("memeover-test-");
	const reopened = createGuildRegistry(root);
	expect(reopened.getConfig(g)).toEqual(guildRegistry.getConfig(g));
	reopened.close();
});
test("registered guild enumeration returns copies", () => {
	const g = guild();
	guildRegistry.register(g, "c");
	const copy = guildRegistry.getRegisteredGuilds().find(([id]) => id === g);
	copy?.[1].channel_ids.push("other");
	expect(guildRegistry.getConfig(g)?.channel_ids).toEqual(["c"]);
});

describe("SQLite persistence", () => {
	const dirs: string[] = [];
	const opened: GuildRegistry[] = [];
	function dataDir() {
		const dir = mkdtempSync(join(tmpdir(), "memeover-test-registry-"));
		dirs.push(dir);
		return dir;
	}
	function open(dir: string) {
		const registry = createGuildRegistry(dir);
		opened.push(registry);
		return registry;
	}
	afterEach(() => {
		for (const registry of opened.splice(0)) registry.close();
		for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
	});

	test("every change survives a restart", () => {
		const dir = dataDir();
		const first = open(dir);
		first.register("guild-1", "channel-1");
		first.setPausedUntil("guild-1", Number.MAX_SAFE_INTEGER);
		first.setBotAppSources("guild-1", true);
		first.recordClientActivity("guild-1", "install-a");
		const oldToken = first.getConfig("guild-1")?.token ?? "";
		first.rotateToken("guild-1");
		first.register("guild-2", null);
		first.unregister("guild-2");
		const before = first.getConfig("guild-1");
		first.close();

		const second = open(dir);
		expect(second.getConfig("guild-1")).toEqual(before);
		expect(second.isRegistered("guild-2")).toBe(false);
		expect(second.getRegisteredCount()).toBe(1);
		expect(second.verifyToken("guild-1", oldToken)).toBe(false);
	});

	test("writes go through a WAL journal", () => {
		const dir = dataDir();
		open(dir).register("guild-1", null);
		const db = new Database(join(dir, "memeover.db"), { readonly: true });
		expect(db.query("PRAGMA journal_mode").get()).toEqual({ journal_mode: "wal" });
		db.close();
	});

	test("guilds.json is imported once on first start, then renamed", () => {
		const dir = dataDir();
		writeFileSync(
			join(dir, "guilds.json"),
			JSON.stringify({
				"guild-1": {
					token: "legacy-token-1",
					channel_ids: ["channel-1"],
					registered_at: 1_700_000_000_000,
					last_active_at: null,
					unique_client_ids: ["install-a"],
				},
				"guild-2": {
					token: "legacy-token-2",
					paused_until: Number.MAX_SAFE_INTEGER,
					channel_ids: [],
					allow_bot_app_sources: true,
					registered_at: 1_700_000_001_000,
					last_active_at: 1_700_000_002_000,
					unique_client_ids: ["install-a", "install-b"],
				},
			}),
		);

		const first = open(dir);
		expect(first.verifyToken("guild-1", "legacy-token-1")).toBe(true);
		// Legacy configs are normalized on import, like the JSON loader did.
		expect(first.getConfig("guild-1")).toMatchObject({
			paused_until: null,
			allow_bot_app_sources: false,
		});
		expect(first.getConfig("guild-2")).toMatchObject({
			paused_until: Number.MAX_SAFE_INTEGER,
			allow_bot_app_sources: true,
			unique_client_ids: ["install-a", "install-b"],
		});
		expect(existsSync(join(dir, "guilds.json"))).toBe(false);
		expect(existsSync(join(dir, "guilds.json.migrated"))).toBe(true);
		first.close();

		// A guilds.json restored later must not overwrite the live registry.
		writeFileSync(
			join(dir, "guilds.json"),
			JSON.stringify({ "guild-1": { token: "stale-token", channel_ids: [] } }),
		);
		const second = open(dir);
		expect(second.verifyToken("guild-1", "legacy-token-1")).toBe(true);
		expect(second.getRegisteredCount()).toBe(2);
	});

	test("a failed JSON rename cannot revive a removed guild or its revoked token", () => {
		const dir = dataDir();
		writeFileSync(
			join(dir, "guilds.json"),
			JSON.stringify({ "guild-1": { token: "legacy-token", channel_ids: ["channel-1"] } }),
		);
		mkdirSync(join(dir, "guilds.json.migrated"));
		const first = open(dir);
		expect(first.verifyToken("guild-1", "legacy-token")).toBe(true);
		expect(existsSync(join(dir, "guilds.json"))).toBe(true);
		first.rotateToken("guild-1");
		expect(first.verifyToken("guild-1", "legacy-token")).toBe(false);
		first.unregister("guild-1");
		first.close();

		const second = open(dir);
		expect(second.getRegisteredCount()).toBe(0);
		expect(second.verifyToken("guild-1", "legacy-token")).toBe(false);
	});

	test("a registry initialized without JSON ignores a stale file even after all guilds are removed", () => {
		const dir = dataDir();
		const first = open(dir);
		first.register("guild-1", null);
		first.unregister("guild-1");
		first.close();
		writeFileSync(
			join(dir, "guilds.json"),
			JSON.stringify({ "guild-1": { token: "stale-token", channel_ids: [] } }),
		);

		const second = open(dir);
		expect(second.getRegisteredCount()).toBe(0);
		expect(second.verifyToken("guild-1", "stale-token")).toBe(false);
	});

	test("an imported empty JSON is not imported again after a rename failure", () => {
		const dir = dataDir();
		writeFileSync(join(dir, "guilds.json"), "{}");
		mkdirSync(join(dir, "guilds.json.migrated"));
		open(dir).close();
		writeFileSync(join(dir, "guilds.json"), "{ truncated");
		expect(open(dir).getRegisteredCount()).toBe(0);
	});

	test("a failed import rolls back all rows and remains retryable", () => {
		const dir = dataDir();
		const file = join(dir, "guilds.json");
		const json = JSON.stringify({
			"guild-1": { token: "token-1", channel_ids: [] },
			"guild-2": { token: "token-2", channel_ids: [] },
		});
		writeFileSync(file, json);
		const db = openRegistryDatabase(join(dir, "memeover.db"));
		try {
			db.run(`CREATE TRIGGER reject_second_guild BEFORE INSERT ON guilds
				WHEN NEW.guild_id = 'guild-2' BEGIN SELECT RAISE(ABORT, 'write refused'); END`);
			expect(() => importLegacyRegistry(db, file)).toThrow("write refused");
			expect(db.query("SELECT COUNT(*) AS count FROM guilds").get()).toEqual({ count: 0 });
			expect(db.query("SELECT COUNT(*) AS count FROM registry_migrations").get()).toEqual({
				count: 0,
			});
			expect(readFileSync(file, "utf8")).toBe(json);
			db.run("DROP TRIGGER reject_second_guild");
			expect(importLegacyRegistry(db, file)).toBe(2);
			expect(db.query("SELECT COUNT(*) AS count FROM guilds").get()).toEqual({ count: 2 });
			expect(db.query("SELECT name FROM registry_migrations").all()).toEqual([
				{ name: "legacy_json" },
			]);
		} finally {
			db.close();
		}
	});

	test("refused SQLite writes leave in-memory tokens, settings and registration intact", () => {
		const dir = dataDir();
		const registry = open(dir);
		registry.register("guild-1", "channel-1");
		const before = structuredClone(registry.getConfig("guild-1"));
		const db = new Database(join(dir, "memeover.db"));
		try {
			db.run(`CREATE TRIGGER reject_writes BEFORE INSERT ON guilds
				BEGIN SELECT RAISE(ABORT, 'write refused'); END`);
			db.run(`CREATE TRIGGER reject_deletes BEFORE DELETE ON guilds
				BEGIN SELECT RAISE(ABORT, 'delete refused'); END`);
			expect(() => registry.rotateToken("guild-1")).toThrow("write refused");
			expect(() => registry.setPausedUntil("guild-1", 123)).toThrow("write refused");
			expect(() => registry.register("guild-2", null)).toThrow("write refused");
			expect(() => registry.unregister("guild-1")).toThrow("delete refused");
			expect(registry.getConfig("guild-1")).toEqual(before);
			expect(registry.isRegistered("guild-2")).toBe(false);
			registry.close();
			expect(open(dir).getConfig("guild-1")).toEqual(before);
		} finally {
			db.close();
		}
	});

	test("a v1 database keeps its guilds and records initialization before accepting deletions", () => {
		const dir = dataDir();
		const first = open(dir);
		const token = first.register("guild-1", "channel-1");
		first.close();
		const db = new Database(join(dir, "memeover.db"));
		db.run("DROP TABLE registry_migrations");
		db.run("PRAGMA user_version = 1");
		db.close();
		writeFileSync(
			join(dir, "guilds.json"),
			JSON.stringify({ "guild-1": { token: "stale-token", channel_ids: [] } }),
		);

		const second = open(dir);
		expect(second.verifyToken("guild-1", token)).toBe(true);
		expect(second.getConfig("guild-1")?.channel_ids).toEqual(["channel-1"]);
		second.unregister("guild-1");
		second.close();
		expect(open(dir).getRegisteredCount()).toBe(0);
	});

	test("unreadable guilds.json stops startup instead of starting empty", () => {
		const dir = dataDir();
		writeFileSync(join(dir, "guilds.json"), "{ truncated");

		expect(() => createGuildRegistry(dir)).toThrow();
		expect(readFileSync(join(dir, "guilds.json"), "utf8")).toBe("{ truncated");
		writeFileSync(
			join(dir, "guilds.json"),
			JSON.stringify({ "guild-1": { token: "repaired-token", channel_ids: [] } }),
		);
		expect(open(dir).verifyToken("guild-1", "repaired-token")).toBe(true);
	});

	test("a database from a newer bot is refused", () => {
		const dir = dataDir();
		const db = new Database(join(dir, "memeover.db"), { create: true });
		db.run("PRAGMA user_version = 99");
		db.close();

		expect(() => createGuildRegistry(dir)).toThrow(/newer than this bot/);
	});
});
