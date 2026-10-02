import { afterAll, afterEach, beforeAll, expect, mock, test } from "bun:test";
import pino from "pino";
import { connect, joinGuild, startServer, type TestClient } from "./test-utils/ws-harness";

mock.module("./utils/config", () => ({
	config: {
		discordToken: "x",
		discordClientId: "123456789012345678",
		wsPort: 0,
		publicWsUrl: "wss://test.example/ws",
		logtailToken: undefined,
		metricsToken: "test-metrics-token",
	},
}));
mock.module("./utils/logger", () => ({ logger: pino({ level: "silent" }) }));
const { guildRegistry } = await import("./utils/registry");
const { createServer, broadcastToGuild } = await import("./server");
let server: ReturnType<typeof startServer>;
const clients: TestClient[] = [];
const guildId = "123456789012345678";
let token: string;
beforeAll(() => {
	token = guildRegistry.register(guildId, null);
	server = startServer(createServer);
});
afterEach(async () => {
	for (const client of clients) client.close();
	await Promise.all(clients.map((c) => c.closed));
	clients.length = 0;
});
afterAll(async () => {
	await server.stop();
	guildRegistry.unregister(guildId);
});
async function client() {
	const c = await connect(server.wsUrl);
	clients.push(c);
	return c;
}
async function joined() {
	const c = await client();
	expect(await joinGuild(c, guildId, token)).toMatchObject({
		success: true,
	});
	expect(await c.next()).toMatchObject({ type: "MEMBER_COUNT_UPDATE", count: 1 });
	return c;
}
test("health", async () => {
	const response = await fetch(`${server.baseUrl}/health`);
	expect(response.status).toBe(200);
	const body = await response.json();
	expect(body.status).toBe("ok");
	expect(typeof body.uptime).toBe("number");
	expect(body.connections.active).toBeGreaterThanOrEqual(0);
});
for (const auth of [undefined, "Bearer wrong", "Bearer test-metrics-token"])
	test(`metrics ${auth}`, async () => {
		const response = await fetch(`${server.baseUrl}/metrics`, {
			headers: auth ? { authorization: auth } : {},
		});
		expect(response.status).toBe(auth === "Bearer test-metrics-token" ? 200 : 401);
		const body = await response.json();
		if (response.status === 200)
			expect(Object.keys(body).sort()).toEqual([
				"connections",
				"errors",
				"guilds",
				"joins",
				"messages",
				"startedAt",
				"uptime",
			]);
	});
test("unknown guild rejects JOIN and leaves socket open", async () => {
	const c = await client();
	expect(await joinGuild(c, "999999999999999999", token)).toMatchObject({
		success: false,
		error: "Unknown guild — run /memeover setup in your Discord server first",
	});
	c.send("not json");
	expect(await c.next()).toMatchObject({ code: "PARSE_ERROR" });
});
test("wrong token", async () =>
	expect(await joinGuild(await client(), guildId, "wrong")).toMatchObject({
		success: false,
		error: "Invalid token",
	}));
test("JOIN is idempotent", async () => {
	const c = await joined();
	expect(await joinGuild(c, guildId, token)).toMatchObject({
		success: true,
	});
	c.send("not json");
	expect(await c.next()).toMatchObject({ code: "PARSE_ERROR" });
});
test("member counts follow second join, close, leave", async () => {
	const first = await joined(),
		second = await client();
	expect(await joinGuild(second, guildId, token)).toMatchObject({ success: true });
	expect(await first.next()).toMatchObject({ count: 2 });
	expect(await second.next()).toMatchObject({ count: 2 });
	second.close();
	await second.closed;
	expect(await first.next()).toMatchObject({ count: 1 });
	first.send({ type: "LEAVE", guild_id: guildId });
	first.send("not json");
	expect(await first.next()).toMatchObject({ code: "PARSE_ERROR" });
});
for (const [input, code] of [
	["not json", "PARSE_ERROR"],
	[{ type: "NOPE" }, "VALIDATION_ERROR"],
	[{ type: "JOIN", guild_id: "12345", token: "wrong" }, "VALIDATION_ERROR"],
] as const)
	test(`validation ${JSON.stringify(input)}`, async () => {
		const c = await client();
		c.send(input);
		expect(await c.next()).toMatchObject({ type: "ERROR", code });
	});
test("six messages exceed the fixed socket quota", async () => {
	const c = await client();
	for (let i = 0; i < 6; i++) c.send({ type: "PONG" });
	expect(await c.next()).toEqual({
		type: "ERROR",
		code: "RATE_LIMITED",
		message: "Too many messages — max 5 per second",
	});
	await expect(c.next(undefined, 50)).rejects.toThrow("Timed out");
});
test("PONG has no reply", async () => {
	const c = await client();
	c.send({ type: "PONG" });
	c.send("not json");
	expect(await c.next()).toMatchObject({ code: "PARSE_ERROR" });
});
test("broadcast reaches only joined clients", async () => {
	const first = await joined(),
		unjoined = await client();
	const event = {
		type: "MEDIA",
		guild_id: guildId,
		channel_id: "c",
		message_id: "m",
		author_id: "a",
		author_username: "A",
		author_avatar_url: "",
		media_url: "https://cdn.discordapp.com/a.png",
		media_type: "image",
		timestamp: 1,
	} as const;
	broadcastToGuild(guildId, event);
	expect(await first.next()).toEqual(event);
	await expect(unjoined.next(undefined, 50)).rejects.toThrow("Timed out");
});
