import { Database } from "bun:sqlite";
import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGuildRegistry, type GuildRegistry, guildRegistry } from "./registry";

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
		first.register("guild-2", null);
		first.unregister("guild-2");
		const before = first.getConfig("guild-1");
		first.close();

		const second = open(dir);
		expect(second.getConfig("guild-1")).toEqual(before);
		expect(second.isRegistered("guild-2")).toBe(false);
		expect(second.getRegisteredCount()).toBe(1);
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

	test("unreadable guilds.json stops startup instead of starting empty", () => {
		const dir = dataDir();
		writeFileSync(join(dir, "guilds.json"), "{ truncated");

		expect(() => createGuildRegistry(dir)).toThrow();
		expect(readFileSync(join(dir, "guilds.json"), "utf8")).toBe("{ truncated");
	});

	test("a database from a newer bot is refused", () => {
		const dir = dataDir();
		const db = new Database(join(dir, "memeover.db"), { create: true });
		db.run("PRAGMA user_version = 99");
		db.close();

		expect(() => createGuildRegistry(dir)).toThrow(/newer than this bot/);
	});
});
