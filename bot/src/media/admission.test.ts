import { describe, expect, test } from "bun:test";
import type { GuildConfig } from "../utils/registry";
import { admitGuildEvent } from "./admission";

const config: GuildConfig = {
	token: "test",
	channel_ids: [],
	paused_until: null,
	allow_bot_app_sources: false,
	registered_at: 0,
	last_active_at: null,
	unique_client_ids: [],
};
const input = {
	channelAllowed: true,
	config,
	source: "user" as const,
	now: 100,
	enforceSourcePolicy: true,
};

describe("guild admission", () => {
	test("accepts a watched human event", () => expect(admitGuildEvent(input)).toBe("ok"));
	test("rejects an unwatched channel before pause and source policy", () => {
		expect(
			admitGuildEvent({
				...input,
				channelAllowed: false,
				source: "bot_app",
				config: { ...config, paused_until: 101 },
			}),
		).toBe("channel_not_watched");
	});
	test("pause takes priority over source policy", () => {
		expect(
			admitGuildEvent({ ...input, source: "bot_app", config: { ...config, paused_until: 101 } }),
		).toBe("paused");
	});
	test("expired pause including its boundary permits admission", () => {
		for (const paused_until of [99, 100])
			expect(admitGuildEvent({ ...input, config: { ...config, paused_until } })).toBe("ok");
	});
	test("bot sources require opt-in, even without a config", () => {
		for (const cfg of [config, null, undefined])
			expect(admitGuildEvent({ ...input, source: "bot_app", config: cfg })).toBe("source_blocked");
		expect(
			admitGuildEvent({
				...input,
				source: "bot_app",
				config: { ...config, allow_bot_app_sources: true },
			}),
		).toBe("ok");
	});
	test("commands bypass source policy but still respect channel and pause", () => {
		const command = { ...input, source: "bot_app" as const, enforceSourcePolicy: false };
		expect(admitGuildEvent(command)).toBe("ok");
		expect(admitGuildEvent({ ...command, channelAllowed: false })).toBe("channel_not_watched");
		expect(admitGuildEvent({ ...command, config: { ...config, paused_until: 101 } })).toBe(
			"paused",
		);
	});
});
