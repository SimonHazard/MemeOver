import { afterEach, expect, setSystemTime, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { guildRegistry } from "./registry";

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
test("registry persists atomically in test directory", () => {
	const g = guild();
	guildRegistry.register(g, null);
	const root = process.env.MEMEOVER_DATA_DIR;
	if (!root) throw new Error("Missing test data dir");
	expect(root).toContain("memeover-test-");
	expect(JSON.parse(readFileSync(join(root, "guilds.json"), "utf8"))[g]).toBeDefined();
	expect(existsSync(join(root, "guilds.json.tmp"))).toBe(false);
});
test("registered guild enumeration returns copies", () => {
	const g = guild();
	guildRegistry.register(g, "c");
	const copy = guildRegistry.getRegisteredGuilds().find(([id]) => id === g);
	copy?.[1].channel_ids.push("other");
	expect(guildRegistry.getConfig(g)?.channel_ids).toEqual(["c"]);
});
