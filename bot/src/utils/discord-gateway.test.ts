import { expect, test } from "bun:test";
import { isDiscordGatewayUsable, markShardLost, markShardReady } from "./discord-gateway";

test("a lost shard makes the gateway unusable until that shard is ready again", () => {
	expect(isDiscordGatewayUsable()).toBe(true);
	markShardLost(0, 4014);
	markShardLost(1, 4004);
	expect(isDiscordGatewayUsable()).toBe(false);
	markShardReady(0);
	expect(isDiscordGatewayUsable()).toBe(false);
	markShardReady(1);
	expect(isDiscordGatewayUsable()).toBe(true);
});
