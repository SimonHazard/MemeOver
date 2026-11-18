import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { TwitchAuth } from "./auth";

const values = new Map<string, unknown>();
const events: { name: string; payload: unknown }[] = [];
let beforeSet: ((key: string, value: unknown) => Promise<void>) | undefined;
let failSave = false;
const store = {
	get: async (key: string) => values.get(key),
	set: async (key: string, value: unknown) => {
		await beforeSet?.(key, value);
		values.set(key, value);
	},
	delete: async (key: string) => values.delete(key),
	save: async () => {
		if (failSave) {
			failSave = false;
			throw new Error("synthetic save failure");
		}
	},
};
mock.module("@tauri-apps/plugin-store", () => ({ Store: { load: async () => store } }));
mock.module("@tauri-apps/api/event", () => ({
	emit: async (name: string, payload: unknown) => {
		events.push({ name, payload });
	},
}));
const { loadTwitchAuth, saveTwitchAuth, clearTwitchAuth } = await import("./auth-store");
const auth: TwitchAuth = {
	accessToken: "fake-access",
	refreshToken: "fake-refresh",
	expiresAt: 10000,
	userId: "123",
	login: "streamer",
	scopes: ["user:read:chat", "channel:read:redemptions"],
};
beforeEach(() => {
	values.clear();
	events.length = 0;
	beforeSet = undefined;
	failSave = false;
});

describe("Twitch auth storage", () => {
	test("persists an account and publishes public metadata only", async () => {
		expect(await saveTwitchAuth(auth)).toBe(true);
		expect(await loadTwitchAuth()).toEqual(auth);
		expect(events).toEqual([
			{ name: "twitch-auth-changed", payload: { connected: true, login: "streamer" } },
		]);
	});
	test("a cleared account cannot be resurrected by a delayed refresh", async () => {
		await saveTwitchAuth(auth);
		const original = await loadTwitchAuth();
		expect(original).not.toBeNull();
		await clearTwitchAuth();
		expect(await saveTwitchAuth({ ...auth, accessToken: "rotated" }, original as TwitchAuth)).toBe(
			false,
		);
		expect(await loadTwitchAuth()).toBeNull();
	});
	test("cleans up a refresh whose write completes after another window disconnected", async () => {
		await saveTwitchAuth(auth);
		const previous = await loadTwitchAuth();
		const sessionId = values.get("sessionId") as string;
		beforeSet = async (key) => {
			if (key === `auth:${sessionId}`) {
				// Other window has already persisted disconnect while the refresh IPC is delayed.
				values.set(`revoked:${sessionId}`, true);
				values.delete(`auth:${sessionId}`);
			}
		};
		events.length = 0;
		expect(await saveTwitchAuth({ ...auth, accessToken: "rotated" }, previous as TwitchAuth)).toBe(
			false,
		);
		expect(values.has(`auth:${sessionId}`)).toBe(false);
		expect(await loadTwitchAuth()).toBeNull();
		expect(events).toEqual([]);
	});
	test("a refresh arriving after a new login preserves the new account", async () => {
		await saveTwitchAuth(auth);
		const previous = await loadTwitchAuth();
		const oldId = values.get("sessionId") as string;
		const newId = crypto.randomUUID();
		const next = { ...auth, userId: "456", login: "next_streamer", accessToken: "next-access" };
		beforeSet = async (key) => {
			if (key === `auth:${oldId}`) {
				values.set(`auth:${newId}`, next);
				values.set("sessionId", newId);
			}
		};
		events.length = 0;
		expect(await saveTwitchAuth({ ...auth, accessToken: "rotated" }, previous as TwitchAuth)).toBe(
			false,
		);
		expect(await loadTwitchAuth()).toEqual(next);
		expect(values.has(`auth:${oldId}`)).toBe(false);
		expect(events).toEqual([]);
	});
	test("conditional clear never invalidates a more recent login", async () => {
		await saveTwitchAuth(auth);
		const previous = await loadTwitchAuth();
		const next = { ...auth, userId: "456", login: "next_streamer" };
		await saveTwitchAuth(next);
		events.length = 0;
		expect(await clearTwitchAuth(previous as TwitchAuth)).toBe(false);
		expect(await loadTwitchAuth()).toEqual(next);
		expect(events).toEqual([]);
	});
	test("cancel during login storage leaves no connected account or credential record", async () => {
		const controller = new AbortController();
		beforeSet = async (key) => {
			if (key === "sessionId") controller.abort();
		};
		expect(await saveTwitchAuth(auth, undefined, controller.signal)).toBe(false);
		expect(await loadTwitchAuth()).toBeNull();
		expect([...values.keys()].some((key) => key.startsWith("auth:"))).toBe(false);
		expect(events).toEqual([]);
	});
	test("a failed write does not poison subsequent mutations", async () => {
		failSave = true;
		await expect(saveTwitchAuth(auth)).rejects.toThrow("synthetic save failure");
		expect(await clearTwitchAuth()).toBe(true);
		expect(await saveTwitchAuth(auth)).toBe(true);
		expect(await loadTwitchAuth()).toEqual(auth);
	});
});
