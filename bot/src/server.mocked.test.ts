import { afterAll, afterEach, beforeAll, expect, mock, spyOn, test } from "bun:test";
import { Layer, ManagedRuntime } from "effect";
import { TestClock } from "effect/testing";
import pino from "pino";
import { Heartbeats } from "./services/heartbeats";
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
const { BotRuntime } = await import("./runtime");
const heartbeatRuntime = ManagedRuntime.make(
	Heartbeats.layer.pipe(Layer.provideMerge(TestClock.layer())),
);
const advanceHeartbeat = (ms: number) => heartbeatRuntime.runPromise(TestClock.adjust(ms));
const { guildRegistry } = await import("./utils/registry");
const { createServer, broadcastToGuild, evictGuild } = await import("./server");
const { applyGuildPause } = await import("./utils/guild-pause-timers");
const { markShardLost, markShardReady } = await import("./utils/discord-gateway");
const { store } = await import("./utils/store");
const { stats } = await import("./utils/stats");
let server: ReturnType<typeof startServer>;
const clients: TestClient[] = [];
const guildId = "123456789012345678";
let token: string;
beforeAll(() => {
	token = guildRegistry.register(guildId, null);
	server = startServer(() => createServer(heartbeatRuntime));
});
afterEach(async () => {
	for (const client of clients) client.close();
	await Promise.all(clients.map((c) => c.closed));
	clients.length = 0;
});
afterAll(async () => {
	await server.stop();
	await heartbeatRuntime.dispose();
	await BotRuntime.dispose();
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
		features: ["guild_state"],
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
test("health fails while Discord has closed the gateway for good", async () => {
	markShardLost(0, 4014);
	try {
		const response = await fetch(`${server.baseUrl}/health`);
		expect(response.status).toBe(503);
		expect((await response.json()).status).toBe("discord_unavailable");
	} finally {
		markShardReady(0);
	}
	expect((await fetch(`${server.baseUrl}/health`)).status).toBe(200);
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
		features: ["guild_state"],
	});
	c.send("not json");
	expect(await c.next()).toMatchObject({ code: "PARSE_ERROR" });
});
test("pause reaches two sockets, repeated JOIN and reconnect, then resumes", async () => {
	const first = await joined(),
		second = await client();
	await joinGuild(second, guildId, token);
	const until = Number.MAX_SAFE_INTEGER;
	try {
		applyGuildPause(guildId, until);
		for (const c of [first, second])
			expect(await c.next((m) => m.type === "GUILD_STATE")).toEqual({
				type: "GUILD_STATE",
				guild_id: guildId,
				paused_until: until,
			});
		// Inspect the handshake explicitly; joinGuild normally consumes GUILD_STATE.
		for (const c of [first, await client()]) {
			c.send({ type: "JOIN", guild_id: guildId, token });
			expect(await c.next((m) => m.type === "JOIN_ACK")).toMatchObject({ success: true });
			expect(await c.next((m) => m.type === "GUILD_STATE")).toMatchObject({ paused_until: until });
		}
		applyGuildPause(guildId, null);
		for (const c of [first, second])
			expect(await c.next((m) => m.type === "GUILD_STATE")).toMatchObject({ paused_until: null });
		applyGuildPause(guildId, Date.now() + 30);
		for (const c of [first, second]) {
			expect(await c.next((m) => m.type === "GUILD_STATE")).toMatchObject({
				paused_until: expect.any(Number),
			});
			expect(await c.next((m) => m.type === "GUILD_STATE")).toMatchObject({ paused_until: null });
		}
	} finally {
		applyGuildPause(guildId, null);
	}
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
test("a failed activity write still removes the disconnected client", async () => {
	const staying = await joined();
	const leaving = await client();
	await joinGuild(leaving, guildId, token);
	expect(await staying.next()).toMatchObject({ type: "MEMBER_COUNT_UPDATE", count: 2 });
	const activity = spyOn(guildRegistry, "recordGuildActivity").mockImplementation(() => {
		throw new Error("Fixture disk failure");
	});
	try {
		leaving.close();
		await leaving.closed;
		expect(await staying.next()).toMatchObject({ type: "MEMBER_COUNT_UPDATE", count: 1 });
		expect(store.getGuildMembers(guildId).size).toBe(1);
		expect(activity.mock.calls).toEqual([[guildId]]);
	} finally {
		activity.mockRestore();
	}
});
test("a failed activity write still lets a joined client leave", async () => {
	const staying = await joined();
	const leaving = await client();
	await joinGuild(leaving, guildId, token);
	await staying.next();
	await leaving.next();
	const activity = spyOn(guildRegistry, "recordGuildActivity").mockImplementation(() => {
		throw new Error("Fixture disk failure");
	});
	try {
		leaving.send({ type: "LEAVE", guild_id: guildId });
		expect(await staying.next()).toMatchObject({ type: "MEMBER_COUNT_UPDATE", count: 1 });
		expect(store.getGuildMembers(guildId).size).toBe(1);
		expect(activity.mock.calls).toEqual([[guildId]]);
		leaving.send("not json");
		expect(await leaving.next()).toMatchObject({ code: "PARSE_ERROR" });
	} finally {
		activity.mockRestore();
	}
});
test("LEAVE from a socket that never joined leaves the guild untouched", async () => {
	const member = await joined();
	const outsider = await client();
	const activity = spyOn(guildRegistry, "recordGuildActivity");
	try {
		outsider.send({ type: "LEAVE", guild_id: guildId });
		outsider.send("not json");
		expect(await outsider.next()).toMatchObject({ code: "PARSE_ERROR" });
		expect(activity).not.toHaveBeenCalled();
		member.send({ type: "LEAVE", guild_id: guildId });
		member.send("not json");
		expect(await member.next()).toMatchObject({ code: "PARSE_ERROR" });
		expect(activity).toHaveBeenCalledTimes(1);
		expect(activity).toHaveBeenCalledWith(guildId);
	} finally {
		activity.mockRestore();
	}
});
test("a reconnecting install keeps the member count while its stale socket lingers", async () => {
	const first = await joined();
	const install = "install-reconnecting";
	const stale = await client(),
		replacement = await client();
	for (const socket of [stale, replacement]) {
		socket.send({ type: "JOIN", guild_id: guildId, token, client_id: install });
		expect(await socket.next((m) => m.type === "JOIN_ACK")).toMatchObject({ success: true });
	}
	expect(await first.next((m) => m.type === "MEMBER_COUNT_UPDATE")).toMatchObject({ count: 2 });
	expect(await first.next((m) => m.type === "MEMBER_COUNT_UPDATE")).toMatchObject({ count: 2 });
	stale.close();
	await stale.closed;
	expect(await first.next((m) => m.type === "MEMBER_COUNT_UPDATE")).toMatchObject({ count: 2 });
	replacement.close();
	await replacement.closed;
	expect(await first.next((m) => m.type === "MEMBER_COUNT_UPDATE")).toMatchObject({ count: 1 });
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
for (const responds of [false, true]) {
	test(
		responds ? "a PONG in time keeps the client" : "a client that misses PONG is dropped",
		async () => {
			const c = await joined();
			const wsId = [...store.getGuildMembers(guildId)][0];
			if (!wsId) throw new Error("Missing joined client");
			await advanceHeartbeat(30_000);
			expect(await c.next()).toEqual({ type: "PING" });
			if (responds) {
				c.send({ type: "PONG" });
				c.send("not json");
				expect(await c.next()).toMatchObject({ code: "PARSE_ERROR" });
				await advanceHeartbeat(10_000);
				expect(store.getGuildMembers(guildId)).toEqual(new Set([wsId]));
				expect(c.socket.readyState).toBe(WebSocket.OPEN);
			} else {
				await advanceHeartbeat(9_999);
				expect(store.getGuildMembers(guildId).has(wsId)).toBe(true);
				await advanceHeartbeat(1);
				expect(store.getGuildMembers(guildId).has(wsId)).toBe(false);
				await c.closed;
			}
		},
	);
}
test("a missed PONG removes membership and records timeout and close metrics only once", async () => {
	const staying = await joined();
	const stayingId = [...store.getGuildMembers(guildId)][0];
	const missing = await client();
	await joinGuild(missing, guildId, token);
	await staying.next();
	await missing.next();
	const before = stats.snapshot();
	const activity = spyOn(guildRegistry, "recordGuildActivity");
	try {
		await advanceHeartbeat(30_000);
		expect(await staying.next()).toEqual({ type: "PING" });
		expect(await missing.next()).toEqual({ type: "PING" });
		staying.send({ type: "PONG" });
		staying.send("not json");
		expect(await staying.next()).toMatchObject({ code: "PARSE_ERROR" });
		await advanceHeartbeat(10_000);
		await missing.closed;
		expect(store.getGuildMembers(guildId)).toEqual(new Set([stayingId]));
		expect(await staying.next()).toMatchObject({ type: "MEMBER_COUNT_UPDATE", count: 1 });
		expect(activity.mock.calls).toEqual([[guildId]]);
		expect(stats.snapshot().connections.active).toBe(before.connections.active - 1);
		expect(stats.snapshot().errors.heartbeatTimeout).toBe(before.errors.heartbeatTimeout + 1);
		await expect(staying.next(undefined, 50)).rejects.toThrow("Timed out");
		expect(activity.mock.calls).toEqual([[guildId]]);
	} finally {
		activity.mockRestore();
	}
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

for (const failure of ["broadcast", "heartbeat"] as const) {
	for (const shape of ["returns 0", "throws"] as const) {
		test(`${failure} send that ${shape} removes membership once and closes the socket`, async () => {
			const first = await joined();
			const firstId = [...store.getGuildMembers(guildId)][0];
			const second = await client();
			await joinGuild(second, guildId, token);
			await first.next((message) => message.type === "MEMBER_COUNT_UPDATE");
			await second.next((message) => message.type === "MEMBER_COUNT_UPDATE");
			const failedId = [...store.getGuildMembers(guildId)].find((id) => id !== firstId);
			const failedClient = failedId ? store.getClient(failedId) : undefined;
			if (!failedClient) throw new Error("Missing joined socket");
			const connections = async () =>
				(await (await fetch(`${server.baseUrl}/health`)).json()).connections.active as number;
			const activeBefore = await connections();
			const timeoutBefore = stats.snapshot().errors.heartbeatTimeout;
			const activity = spyOn(guildRegistry, "recordGuildActivity");
			const send = spyOn(failedClient.ws_ref, "send").mockImplementation(() => {
				if (shape === "throws") throw new Error("Socket send failed");
				return 0;
			});
			try {
				if (failure === "broadcast") {
					broadcastToGuild(guildId, {
						type: "GUILD_STATE",
						guild_id: guildId,
						paused_until: null,
					});
					await first.next((message) => message.type === "GUILD_STATE");
				} else {
					await advanceHeartbeat(30_000);
					expect(await first.next()).toEqual({ type: "PING" });
					first.send({ type: "PONG" });
					first.send("not json");
					expect(await first.next((message) => message.type === "ERROR")).toMatchObject({
						code: "PARSE_ERROR",
					});
				}
				expect(store.getClient(failedClient.ws_id)).toBeUndefined();
				expect(store.getGuildMembers(guildId)).toEqual(new Set([firstId]));
				expect(await first.next()).toMatchObject({ type: "MEMBER_COUNT_UPDATE", count: 1 });
				expect(activity.mock.calls).toEqual([[guildId]]);
				await second.closed;
				expect(await connections()).toBe(activeBefore - 1);
				expect(stats.snapshot().errors.heartbeatTimeout).toBe(timeoutBefore);
				expect(activity.mock.calls).toEqual([[guildId]]);
				await expect(first.next(undefined, 50)).rejects.toThrow("Timed out");
			} finally {
				send.mockRestore();
				activity.mockRestore();
			}
		});
	}
}

test("a send queued under backpressure keeps the client", async () => {
	const first = await joined();
	const firstId = [...store.getGuildMembers(guildId)][0];
	const target = firstId ? store.getClient(firstId) : undefined;
	if (!target) throw new Error("Missing joined socket");
	const send = spyOn(target.ws_ref, "send").mockImplementation(() => -1);
	try {
		broadcastToGuild(guildId, { type: "GUILD_STATE", guild_id: guildId, paused_until: null });
		expect(store.getGuildMembers(guildId)).toEqual(new Set([firstId]));
	} finally {
		send.mockRestore();
	}
	first.close();
});

test("a heartbeat queued under backpressure accepts PONG and keeps the client", async () => {
	const c = await joined();
	const wsId = [...store.getGuildMembers(guildId)][0];
	const target = wsId ? store.getClient(wsId) : undefined;
	if (!target) throw new Error("Missing joined socket");
	const send = spyOn(target.ws_ref, "send").mockImplementation(() => -1);
	try {
		await advanceHeartbeat(30_000);
		expect(send).toHaveBeenCalledWith(JSON.stringify({ type: "PING" }));
	} finally {
		send.mockRestore();
	}
	c.send({ type: "PONG" });
	c.send("not json");
	expect(await c.next()).toMatchObject({ code: "PARSE_ERROR" });
	await advanceHeartbeat(10_000);
	expect(store.getGuildMembers(guildId)).toEqual(new Set([wsId]));
	expect(c.socket.readyState).toBe(WebSocket.OPEN);
});

test("rotation evicts immediately and only new credentials can rejoin", async () => {
	const g = "123456789012345679",
		old = guildRegistry.register(g, null),
		a = await client(),
		unjoined = await client();
	try {
		expect(await joinGuild(a, g, old)).toMatchObject({ success: true });
		await a.next();
		const next = guildRegistry.rotateToken(g);
		expect(evictGuild(g, "TOKEN_ROTATED", "msg", "Token rotated")).toBe(1);
		expect(await a.next()).toEqual({ type: "ERROR", code: "TOKEN_ROTATED", message: "msg" });
		expect((await a.closed).code).toBe(1008);
		broadcastToGuild(g, {
			type: "TEXT",
			guild_id: g,
			channel_id: "c",
			message_id: "m",
			author_id: "a",
			author_username: "A",
			author_avatar_url: "",
			text: "after revocation",
			timestamp: 1,
		});
		const b = await client();
		expect(await joinGuild(b, g, old)).toMatchObject({ success: false, error: "Invalid token" });
		expect(await joinGuild(b, g, next ?? "")).toMatchObject({ success: true });
		expect(await b.next()).toMatchObject({ count: 1 });
		unjoined.send("not json");
		expect(await unjoined.next()).toMatchObject({ code: "PARSE_ERROR" });
	} finally {
		guildRegistry.unregister(g);
	}
});
test("removal evicts and rejects later joins", async () => {
	const g = "123456789012345680",
		secret = guildRegistry.register(g, null),
		a = await client();
	expect(await joinGuild(a, g, secret)).toMatchObject({ success: true });
	await a.next();
	guildRegistry.unregister(g);
	expect(evictGuild(g, "GUILD_UNREGISTERED", "removed")).toBe(1);
	expect(await a.next()).toMatchObject({ code: "GUILD_UNREGISTERED" });
	expect((await a.closed).code).toBe(1008);
	expect(await joinGuild(await client(), g, secret)).toMatchObject({
		success: false,
		error: "Unknown guild — run /memeover setup in your Discord server first",
	});
});
test("multi-guild socket retains other authorized room", async () => {
	const g = "123456789012345681",
		secret = guildRegistry.register(g, null),
		a = await joined();
	try {
		expect(await joinGuild(a, g, secret)).toMatchObject({ success: true });
		await a.next();
		expect(evictGuild(g, "TOKEN_ROTATED", "msg")).toBe(1);
		expect(await a.next()).toMatchObject({ code: "TOKEN_ROTATED" });
		broadcastToGuild(guildId, {
			type: "TEXT",
			guild_id: guildId,
			channel_id: "c",
			message_id: "m",
			author_id: "a",
			author_username: "A",
			author_avatar_url: "",
			text: "still joined",
			timestamp: 1,
		});
		expect(await a.next()).toMatchObject({ text: "still joined" });
	} finally {
		guildRegistry.unregister(g);
	}
});
