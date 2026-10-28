import { afterEach, expect, mock, spyOn, test } from "bun:test";
import { Client, Events, type Guild } from "discord.js";
import type { GuildConfig } from "./registry";

const evictions: unknown[][] = [];
const unregisteredAtEviction: boolean[] = [];
mock.module("../server", () => ({
	broadcastToGuild: () => {},
	evictGuild: (...args: unknown[]) => {
		evictions.push(args);
		unregisteredAtEviction.push(guildRegistry.getConfig(String(args[0])) === undefined);
		return 0;
	},
}));
const { guildRegistry } = await import("./registry");
const { store } = await import("./store");
const { cleanupReason, runGuildCleanup, unregisterRemovedGuild } = await import("./cleanup");

const HOUR = 60 * 60 * 1000;
const guild = "123456789012345678";
const wsId = "cleanup-test-ws";
const client = { guilds: { fetch: async () => null } } as unknown as Client;
const cfg: GuildConfig = {
	registered_at: 0,
	last_active_at: 0,
	unique_client_ids: ["a", "b"],
	channel_ids: [],
	paused_until: null,
	allow_bot_app_sources: false,
	token: "t",
};

afterEach(() => {
	mock.restore();
	guildRegistry.unregister(guild);
	store.removeClient(wsId);
	evictions.length = 0;
	unregisteredAtEviction.length = 0;
});

// Stamp an old fixture through the real registry API, then restore the real clock before
// running the job. This exercises SQLite deletion without modifying registry internals.
function registerOldGuild(): string {
	const clock = spyOn(Date, "now").mockReturnValue(Date.now() - 49 * HOUR);
	try {
		const token = guildRegistry.register(guild, null);
		guildRegistry.recordClientActivity(guild, "a");
		guildRegistry.recordClientActivity(guild, "b");
		return token;
	} finally {
		clock.mockRestore();
	}
}

function noticeClient(onFetch: () => void): Client {
	return {
		guilds: {
			fetch: async () => {
				onFetch();
				return null;
			},
		},
	} as unknown as Client;
}

test("inactive registrations expire at 48 hours, not 24 or just before 48", () => {
	for (const now of [24 * HOUR, 47 * HOUR, 48 * HOUR - 1]) {
		expect(cleanupReason(guild, cfg, now)).toBeNull();
	}
	expect(cleanupReason(guild, cfg, 48 * HOUR)).toBe("inactive_48h");
});

test("registrations with no activity use their registration timestamp", () => {
	const unused = { ...cfg, last_active_at: null };
	expect(cleanupReason(guild, unused, 48 * HOUR - 1)).toBeNull();
	expect(cleanupReason(guild, unused, 48 * HOUR)).toBe("inactive_48h");
});

test("single-client registrations expire at age 48 hours despite recent activity", () => {
	const recent = { ...cfg, last_active_at: 47 * HOUR };
	for (const unique_client_ids of [[], ["a"]]) {
		const single = { ...recent, unique_client_ids };
		expect(cleanupReason(guild, single, 48 * HOUR - 1)).toBeNull();
		expect(cleanupReason(guild, single, 48 * HOUR)).toBe("single_unique_client");
	}
	expect(cleanupReason(guild, recent, 48 * HOUR)).toBeNull();
});

test("a connected overlay prevents both cleanup triggers", () => {
	store.addClient(wsId, {} as never);
	store.joinGuild(wsId, guild);
	expect(cleanupReason(guild, cfg, 72 * HOUR)).toBeNull();
	expect(cleanupReason(guild, { ...cfg, unique_client_ids: ["a"] }, 72 * HOUR)).toBeNull();
});

test("a future scan timestamp cannot bypass the real-clock recheck", async () => {
	guildRegistry.register(guild, null);
	await runGuildCleanup(client, Date.now() + 49 * HOUR);
	expect(guildRegistry.getConfig(guild)).toBeDefined();
	expect(evictions).toHaveLength(0);
});

test("the cleanup job deletes an expired registration even when Discord is unavailable", async () => {
	const token = registerOldGuild();
	await runGuildCleanup(client);
	expect(guildRegistry.getConfig(guild)).toBeUndefined();
	expect(guildRegistry.verifyToken(guild, token)).toBe(false);
	expect(evictions).toHaveLength(1);
	expect(evictions[0].slice(0, 2)).toEqual([guild, "GUILD_UNREGISTERED"]);
	expect(unregisteredAtEviction).toEqual([true]);
});

test("reconnecting during the Discord notice preserves the registration", async () => {
	const token = registerOldGuild();
	await runGuildCleanup(
		noticeClient(() => {
			store.addClient(wsId, {} as never);
			store.joinGuild(wsId, guild);
		}),
	);
	expect(guildRegistry.verifyToken(guild, token)).toBe(true);
	expect(evictions).toHaveLength(0);
});

test("fresh activity during the Discord notice preserves a disconnected registration", async () => {
	const token = registerOldGuild();
	await runGuildCleanup(noticeClient(() => guildRegistry.recordGuildActivity(guild)));
	expect(guildRegistry.verifyToken(guild, token)).toBe(true);
	expect(evictions).toHaveLength(0);
});

test("a replacement registration during the Discord notice is preserved", async () => {
	registerOldGuild();
	let replacement: string | undefined;
	await runGuildCleanup(
		noticeClient(() => {
			guildRegistry.unregister(guild);
			replacement = registerOldGuild();
		}),
	);
	expect(guildRegistry.getConfig(guild)?.token).toBe(replacement);
	expect(evictions).toHaveLength(0);
});

test("removal deletes the registration before eviction and is idempotent", () => {
	const token = guildRegistry.register(guild, null);
	expect(unregisterRemovedGuild(guild)).toBe(true);
	expect(guildRegistry.getConfig(guild)).toBeUndefined();
	expect(guildRegistry.verifyToken(guild, token)).toBe(false);
	expect(evictions).toHaveLength(1);
	expect(evictions[0]).toEqual([
		guild,
		"GUILD_UNREGISTERED",
		expect.stringContaining("removed from this Discord server"),
		"Bot removed from guild",
	]);
	expect(unregisteredAtEviction).toEqual([true]);
	expect(unregisterRemovedGuild(guild)).toBe(false);
	expect(evictions).toHaveLength(1);
});

test("Discord outages preserve registration, then actual removal deletes an unavailable guild", async () => {
	const discord = new Client({ intents: [] });
	const cachedGuild = {
		id: guild,
		available: true,
		channels: { cache: new Map() },
	} as unknown as Guild;
	discord.guilds.cache.set(guild, cachedGuild);
	discord.on(Events.GuildDelete, (removed) => unregisterRemovedGuild(removed.id));
	// Exercise the installed discord.js gateway action, including its outage/removal distinction.
	const action = (
		discord as unknown as {
			actions: { GuildDelete: { handle(data: { id: string; unavailable?: boolean }): void } };
		}
	).actions.GuildDelete;
	const token = guildRegistry.register(guild, null);
	try {
		action.handle({ id: guild, unavailable: true });
		expect(cachedGuild.available).toBe(false);
		expect(guildRegistry.verifyToken(guild, token)).toBe(true);
		expect(evictions).toHaveLength(0);
		action.handle({ id: guild });
		expect(guildRegistry.getConfig(guild)).toBeUndefined();
		expect(evictions).toHaveLength(1);
	} finally {
		await discord.destroy();
	}
});
