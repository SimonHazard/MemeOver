import { beforeEach, expect, mock, test } from "bun:test";
import type { ChatInputCommandInteraction } from "discord.js";
import { logHash } from "../../utils/log-privacy";
import type { GuildConfig } from "../../utils/registry-state";

const guildId = "123456789012345701";
const channelId = "123456789012345702";
const actorId = "123456789012345703";
const fixtureToken = "0123456789abcdef0123456789abcdef";
const writeError = new Error("Fixture mutation failed");
const replyError = new Error("Fixture Discord reply failed");
let cfg: GuildConfig | undefined;
let failure: "throw" | "refuse" | null = null;
const order: string[] = [];
const logs: Record<string, unknown>[] = [];

function fixtureConfig(): GuildConfig {
	return {
		token: fixtureToken,
		channel_ids: [channelId],
		paused_until: Number.MAX_SAFE_INTEGER,
		allow_bot_app_sources: false,
		registered_at: 1,
		last_active_at: null,
		unique_client_ids: [],
	};
}
function canMutate(): boolean {
	if (failure === "throw") throw writeError;
	return failure !== "refuse";
}
mock.module("../../utils/logger", () => ({
	logger: {
		child: () => ({
			info: (fields: Record<string, unknown>) => {
				order.push("log");
				logs.push(fields);
			},
		}),
	},
}));
mock.module("../../utils/registry", () => ({
	guildRegistry: {
		getConfig: () => cfg,
		isRegistered: () => Boolean(cfg),
		register: () => {
			if (!canMutate()) throw writeError;
			cfg = fixtureConfig();
			order.push("mutation");
			return fixtureToken;
		},
		setBotAppSources: (_guild: string, enabled: boolean) => {
			if (!canMutate() || !cfg) return null;
			cfg = { ...cfg, allow_bot_app_sources: enabled };
			order.push("mutation");
			return cfg;
		},
	},
}));
mock.module("../../utils/guild-pause-timers", () => ({
	applyGuildPause: (_guild: string, until: number | null) => {
		if (!canMutate() || !cfg) return false;
		cfg = { ...cfg, paused_until: until };
		order.push("mutation");
		return true;
	},
}));
mock.module("../../utils/presence", () => ({ schedulePresenceRefresh: () => {} }));
mock.module("../../server", () => ({ evictGuild: () => 0 }));
const { handleSetup } = await import("./setup");
const { handleBots } = await import("./bots");
const { handlePause } = await import("./pause");
const { handleResume } = await import("./resume");
const { handleRotate } = await import("./rotate");
const { handleRemove } = await import("./remove");

function interaction(rejectReply = false): ChatInputCommandInteraction {
	return {
		locale: "en-US",
		user: { id: actorId },
		options: {
			getChannel: () => ({ id: channelId }),
			getBoolean: () => true,
			getString: () => "indefinite",
		},
		reply: async () => {
			order.push("reply");
			if (rejectReply) throw replyError;
		},
	} as unknown as ChatInputCommandInteraction;
}

beforeEach(() => {
	cfg = fixtureConfig();
	failure = null;
	order.length = 0;
	logs.length = 0;
});

const mutations = [
	{ name: "setup", handle: handleSetup, extra: { channel_hash: logHash(channelId) } },
	{ name: "bots", handle: handleBots, extra: { enabled: true } },
	{ name: "pause", handle: handlePause, extra: { choice: "indefinite" } },
	{ name: "resume", handle: handleResume, extra: {} },
];
for (const { name, handle, extra } of mutations) {
	test(`${name} logs the applied mutation before a rejected Discord reply, with private references`, async () => {
		if (name === "setup") cfg = undefined;
		await expect(handle(interaction(true), guildId)).rejects.toBe(replyError);
		expect(order).toEqual(["mutation", "log", "reply"]);
		expect(logs).toEqual([
			{ event: `admin_${name}`, guild_hash: logHash(guildId), actor: logHash(actorId), ...extra },
		]);
		const serialized = JSON.stringify(logs);
		for (const privateValue of [guildId, channelId, actorId, fixtureToken]) {
			expect(serialized).not.toContain(privateValue);
		}
		if (name === "setup") expect(cfg?.token).toBe(fixtureToken);
		if (name === "bots") expect(cfg?.allow_bot_app_sources).toBe(true);
		if (name === "pause") expect(cfg?.paused_until).toBe(Number.MAX_SAFE_INTEGER);
		if (name === "resume") expect(cfg?.paused_until).toBeNull();
	});

	test(`${name} never logs success when its mutation throws`, async () => {
		failure = "throw";
		const original = cfg;
		await expect(handle(interaction(), guildId)).rejects.toBe(writeError);
		expect(cfg).toBe(original);
		expect(logs).toEqual([]);
		expect(order).toEqual([]);
	});

	if (name !== "setup") {
		test(`${name} never logs success when its mutation is refused`, async () => {
			failure = "refuse";
			const original = cfg;
			await handle(interaction(), guildId);
			expect(cfg).toBe(original);
			expect(logs).toEqual([]);
			expect(order).toEqual(["reply"]);
		});
	}
}

for (const [name, handle] of [
	["rotate", handleRotate],
	["remove", handleRemove],
] as const) {
	test(`${name} logs only a confirmation request after Discord accepts the reply`, async () => {
		await handle(interaction(), guildId);
		expect(order).toEqual(["reply", "log"]);
		expect(logs).toEqual([
			{
				event: `admin_${name}_confirmation_requested`,
				guild_hash: logHash(guildId),
				actor: logHash(actorId),
			},
		]);
	});

	test(`${name} does not log a confirmation request when Discord rejects the reply`, async () => {
		await expect(handle(interaction(true), guildId)).rejects.toBe(replyError);
		expect(order).toEqual(["reply"]);
		expect(logs).toEqual([]);
	});
}
