import { expect, test } from "bun:test";
import type { TwitchAuth } from "./auth";
import { startTwitchRuntime } from "./eventsub-runtime";
import type { TwitchStatus } from "./status";

class FakeSocket {
	onopen: WebSocket["onopen"] = null;
	onmessage: WebSocket["onmessage"] = null;
	onclose: WebSocket["onclose"] = null;
	onerror: WebSocket["onerror"] = null;
	closed = false;
	constructor(readonly url: string) {}
	close() {
		this.closed = true;
	}
	message(type: string, payload: unknown = {}, id: string = crypto.randomUUID()) {
		this.onmessage?.call(
			this as unknown as WebSocket,
			{
				data: JSON.stringify({
					metadata: {
						message_id: id,
						message_type: type,
						subscription_type: "channel.chat.message",
					},
					payload,
				}),
			} as MessageEvent<string>,
		);
	}
	welcome() {
		this.message("session_welcome", { session: { id: "session", keepalive_timeout_seconds: 30 } });
	}
}
async function flush() {
	for (let i = 0; i < 40; i++) await Promise.resolve();
}

function harness(
	options: {
		expiresAt?: number;
		response?: (
			url: string,
			init?: RequestInit,
		) => Promise<Response | undefined> | Response | undefined;
	} = {},
) {
	let time = 100;
	let stored: TwitchAuth | null = {
		accessToken: "access-original",
		refreshToken: "refresh-original",
		expiresAt: options.expiresAt ?? 14_400_100,
		userId: "123",
		login: "streamer",
		scopes: ["user:read:chat", "channel:read:redemptions"],
	};
	const sockets: FakeSocket[] = [];
	const statuses: TwitchStatus[] = [];
	const notifications: unknown[] = [];
	let accountClears = 0;
	const calls: string[] = [];
	const saves: TwitchAuth[] = [];
	const timers: { callback: () => void; delay: number; active: boolean }[] = [];
	const intervals = new Map<number, () => void>();
	const deps = {
		clientId: "client",
		now: () => time,
		fetch: (async (url, init) => {
			const path = String(url);
			calls.push(path);
			const custom = await options.response?.(path, init);
			if (custom) return custom;
			if (path.endsWith("/validate"))
				return Response.json({
					client_id: "client",
					user_id: "123",
					login: "streamer",
					scopes: ["user:read:chat", "channel:read:redemptions"],
					expires_in: 14_400,
				});
			if (path.endsWith("/token"))
				return Response.json({
					access_token: "access-new",
					refresh_token: "refresh-new",
					expires_in: 14_400,
					scope: ["user:read:chat", "channel:read:redemptions"],
				});
			if (path.includes("/custom_rewards")) return Response.json({ data: [] });
			return new Response(null, { status: 202 });
		}) as typeof fetch,
		createSocket: (url: string) => {
			const socket = new FakeSocket(url);
			sockets.push(socket);
			return socket as unknown as WebSocket;
		},
		loadAuth: async () => stored,
		saveAuth: async (auth: TwitchAuth, previous: TwitchAuth) => {
			if (stored?.refreshToken !== previous.refreshToken) return false;
			saves.push(auth);
			stored = auth;
			return true;
		},
		clearAuth: async (previous: TwitchAuth) => {
			if (stored?.refreshToken !== previous.refreshToken) return false;
			stored = null;
			return true;
		},
		onStatus: (status: TwitchStatus) => {
			statuses.push(status);
		},
		onRewards: () => {},
		onAccountCleared: () => {
			accountClears++;
		},
		onNotification: (_type: string, event: unknown) => {
			notifications.push(event);
		},
		reconnectDelay: () => 1000,
		later: (callback: () => void, delay: number) => {
			const timer = { callback, delay, active: true };
			timers.push(timer);
			return () => {
				timer.active = false;
			};
		},
		every: (callback: () => void, delay: number) => {
			intervals.set(delay, callback);
			return () => {
				intervals.delete(delay);
			};
		},
	};
	return {
		deps,
		sockets,
		statuses,
		calls,
		saves,
		notifications,
		intervals,
		stored: () => stored,
		accountClears: () => accountClears,
		setStored: (auth: TwitchAuth | null) => {
			stored = auth;
		},
		setTime: (value: number) => {
			time = value;
		},
		pendingRetries: () => timers.filter((timer) => timer.active && timer.delay === 1000),
	};
}

test("subscribes in parallel, publishes connected status, cleans all resources", async () => {
	const h = harness();
	const runtime = startTwitchRuntime(h.deps);
	await flush();
	expect(h.sockets).toHaveLength(1);
	h.sockets[0].welcome();
	await flush();
	expect(h.calls.filter((url) => url.endsWith("/eventsub/subscriptions"))).toHaveLength(6);
	expect(h.statuses[h.statuses.length - 1]).toBe("connected");
	runtime.stop();
	expect(h.sockets[0].closed).toBe(true);
	expect(h.intervals.size).toBe(0);
});

test("error followed by close schedules a single reconnect", async () => {
	const h = harness();
	const runtime = startTwitchRuntime(h.deps);
	await flush();
	const handler = h.sockets[0].onerror;
	handler?.call(h.sockets[0] as unknown as WebSocket, new Event("error"));
	handler?.call(h.sockets[0] as unknown as WebSocket, new Event("close"));
	expect(h.pendingRetries()).toHaveLength(1);
	runtime.stop();
});

test("handover keeps the old socket until welcome and deduplicates across both", async () => {
	const h = harness();
	const runtime = startTwitchRuntime(h.deps);
	await flush();
	const old = h.sockets[0];
	old.welcome();
	await flush();
	old.message("notification", { event: { message: "one" } }, "shared-id");
	old.message("session_reconnect", {
		session: { reconnect_url: "wss://eventsub.wss.twitch.tv/ws?resume=1" },
	});
	expect(h.sockets).toHaveLength(2);
	expect(old.closed).toBe(false);
	const replacement = h.sockets[1];
	replacement.welcome();
	expect(old.closed).toBe(true);
	replacement.message("notification", { event: { message: "one" } }, "shared-id");
	expect(h.notifications).toHaveLength(1);
	expect(h.calls.filter((url) => url.endsWith("/eventsub/subscriptions"))).toHaveLength(6);
	runtime.stop();
});

test("single-use refresh is shared across remounts and saved before failing validation", async () => {
	let release: ((response: Response) => void) | undefined;
	const h = harness({
		expiresAt: 0,
		response: (url) => {
			if (url.endsWith("/token"))
				return new Promise<Response>((resolve) => {
					release = resolve;
				});
			if (url.endsWith("/validate")) throw new Error("offline");
			return new Response(null, { status: 202 });
		},
	});
	const first = startTwitchRuntime(h.deps);
	await flush();
	first.stop();
	const second = startTwitchRuntime(h.deps);
	await flush();
	expect(h.calls.filter((url) => url.endsWith("/token"))).toHaveLength(1);
	release?.(
		Response.json({
			access_token: "rotated",
			refresh_token: "rotated-refresh",
			expires_in: 14_400,
			scope: ["user:read:chat", "channel:read:redemptions"],
		}),
	);
	await flush();
	expect(h.saves).toHaveLength(1);
	expect(h.stored()?.refreshToken).toBe("rotated-refresh");
	expect(h.pendingRetries()).toHaveLength(1);
	second.stop();
});

test("disconnect while refresh is pending cannot restore the signed-out account", async () => {
	let release: ((response: Response) => void) | undefined;
	const h = harness({
		expiresAt: 0,
		response: (url) =>
			url.endsWith("/token")
				? new Promise<Response>((resolve) => {
						release = resolve;
					})
				: new Response(null, { status: 202 }),
	});
	const runtime = startTwitchRuntime(h.deps);
	await flush();
	h.setStored(null);
	const changed = runtime.authChanged();
	release?.(
		Response.json({
			access_token: "late",
			refresh_token: "late-refresh",
			expires_in: 14_400,
			scope: [],
		}),
	);
	await changed;
	await flush();
	expect(h.stored()).toBeNull();
	expect(h.sockets).toHaveLength(0);
	expect(h.saves).toHaveLength(0);
	runtime.stop();
});

test("a second unauthorized subscription stops after one refresh", async () => {
	const h = harness({
		response: (url) =>
			url.endsWith("/eventsub/subscriptions") ? new Response(null, { status: 401 }) : undefined,
	});
	const runtime = startTwitchRuntime(h.deps);
	await flush();
	h.sockets[0].welcome();
	await flush();
	expect(h.sockets).toHaveLength(2);
	h.sockets[1].welcome();
	await flush();
	expect(h.calls.filter((url) => url.endsWith("/token"))).toHaveLength(1);
	expect(h.statuses[h.statuses.length - 1]).toBe("reauth_required");
	expect(h.stored()).toBeNull();
	expect(h.pendingRetries()).toHaveLength(0);
	runtime.stop();
});

test("disconnect closes an active session immediately while hourly refresh is pending", async () => {
	let validates = 0;
	let release: ((response: Response) => void) | undefined;
	const h = harness({
		response: (url) => {
			if (url.endsWith("/validate") && ++validates === 2)
				return new Response(null, { status: 401 });
			if (url.endsWith("/token"))
				return new Promise<Response>((resolve) => {
					release = resolve;
				});
		},
	});
	const runtime = startTwitchRuntime(h.deps);
	await flush();
	h.sockets[0].welcome();
	await flush();
	h.intervals.get(3_600_000)?.();
	await flush();
	expect(release).toBeDefined();
	h.setStored(null);
	await runtime.authChanged();
	expect(h.accountClears()).toBe(1);
	expect(h.sockets[0].closed).toBe(true);
	expect(h.statuses[h.statuses.length - 1]).toBe("signed_out");
	release?.(
		Response.json({
			access_token: "late",
			refresh_token: "late-pair",
			expires_in: 14_400,
			scope: [],
		}),
	);
	await flush();
	expect(h.stored()).toBeNull();
	expect(h.sockets).toHaveLength(1);
	runtime.stop();
});

test("reopening settings can request the current connected status, and silence retries", async () => {
	const h = harness();
	const runtime = startTwitchRuntime(h.deps);
	await flush();
	h.sockets[0].welcome();
	await flush();
	const count = h.statuses.length;
	await runtime.requestRewards();
	expect(h.statuses.slice(count)).toEqual(["connected"]);
	h.setTime(35_101);
	h.intervals.get(5_000)?.();
	expect(h.sockets[0].closed).toBe(true);
	expect(h.pendingRetries()).toHaveLength(1);
	runtime.stop();
});

test("hourly invalidation refreshes and reconnects, then late callbacks after stop do nothing", async () => {
	let validates = 0;
	const h = harness({
		response: (url) =>
			url.endsWith("/validate") && ++validates === 2
				? new Response(null, { status: 401 })
				: undefined,
	});
	const runtime = startTwitchRuntime(h.deps);
	await flush();
	h.sockets[0].welcome();
	await flush();
	h.intervals.get(3_600_000)?.();
	await flush();
	expect(h.calls.filter((url) => url.endsWith("/token"))).toHaveLength(1);
	expect(h.sockets).toHaveLength(2);
	const callback = h.sockets[1].onmessage;
	runtime.stop();
	callback?.call(
		h.sockets[1] as unknown as WebSocket,
		{
			data: JSON.stringify({
				metadata: {
					message_id: "late",
					message_type: "notification",
					subscription_type: "channel.chat.message",
				},
				payload: { event: {} },
			}),
		} as MessageEvent<string>,
	);
	expect(h.notifications).toHaveLength(0);
});
