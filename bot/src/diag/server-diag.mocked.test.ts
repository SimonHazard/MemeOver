import { afterAll, afterEach, beforeAll, expect, mock, test } from "bun:test";
import pino from "pino";
import { connect, joinGuild, startServer, type TestClient } from "../test-utils/ws-harness";
import type { GuildDiagFacts } from "./diag";

mock.module("../utils/config", () => ({
	config: {
		discordToken: "x",
		discordClientId: "123456789012345678",
		wsPort: 0,
		publicWsUrl: "wss://test.example/ws",
	},
}));
mock.module("../utils/logger", () => ({ logger: pino({ level: "silent" }) }));
let fail = false,
	calls = 0;
let complete: (() => void) | null = null;
let hold = false;
mock.module("./discord-diag", () => ({
	collectGuildDiagFacts: async (guildId: string): Promise<GuildDiagFacts> => {
		calls++;
		if (hold)
			await new Promise<void>((resolve) => {
				complete = resolve;
			});
		if (fail) throw new Error("unavailable");
		return {
			guildId,
			cfg: {
				channel_ids: [],
				paused_until: null,
				allow_bot_app_sources: true,
				token: "test",
				registered_at: 1,
				last_active_at: 1,
				unique_client_ids: [],
			},
			overlaysConnected: 1,
			clientId: "123456789012345679",
			intent: true,
			channels: [],
			unviewableCount: 0,
		};
	},
}));
const { guildRegistry } = await import("../utils/registry");
const { createServer } = await import("../server");
const guild = "123456789012345678";
let token: string, server: ReturnType<typeof startServer>;
const clients: TestClient[] = [];
beforeAll(() => {
	token = guildRegistry.register(guild, null);
	server = startServer(createServer);
});
afterEach(async () => {
	for (const c of clients) c.close();
	await Promise.all(clients.map((c) => c.closed));
	clients.length = 0;
	fail = false;
	hold = false;
	calls = 0;
	complete = null;
});
afterAll(async () => {
	await server.stop();
	guildRegistry.unregister(guild);
});
async function client(join = true) {
	const c = await connect(server.wsUrl);
	clients.push(c);
	if (join) {
		await joinGuild(c, guild, token);
		await c.next();
	}
	return c;
}
const request = { type: "DIAG_REQUEST", guild_id: guild };
test("DIAG requires membership before consulting Discord", async () => {
	const c = await client(false);
	c.send(request);
	expect(await c.next()).toMatchObject({ type: "ERROR", code: "NOT_JOINED" });
	expect(calls).toBe(0);
});
test("joined DIAG returns facts, cooldown is socket-local", async () => {
	const c = await client();
	c.send(request);
	expect(await c.next()).toMatchObject({ type: "DIAG", guild_id: guild, registered: true });
	c.send(request);
	expect(await c.next()).toMatchObject({ code: "RATE_LIMITED" });
	expect(calls).toBe(1);
	const second = await client();
	second.send(request);
	expect(await second.next((m) => m.type === "DIAG")).toMatchObject({ guild_id: guild });
	expect(calls).toBe(2);
});
test("adapter failure becomes DIAG_UNAVAILABLE", async () => {
	fail = true;
	const c = await client();
	c.send(request);
	expect(await c.next()).toMatchObject({ type: "ERROR", code: "DIAG_UNAVAILABLE" });
});
test("leaving during collection prevents late disclosure", async () => {
	hold = true;
	const c = await client();
	c.send(request);
	for (let i = 0; i < 50 && !complete; i++) await Bun.sleep(5);
	expect(complete).not.toBeNull();
	c.send({ type: "LEAVE", guild_id: guild });
	c.send("invalid");
	expect(await c.next()).toMatchObject({ code: "PARSE_ERROR" });
	if (complete) (complete as () => void)();
	await expect(c.next((m) => m.type === "DIAG", 50)).rejects.toThrow("Timed out");
});
