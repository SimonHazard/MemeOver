import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import type { ButtonInteraction } from "discord.js";

const evictGuild = mock(() => 0);
mock.module("../server", () => ({ evictGuild, broadcastToGuild: mock() }));
const { guildRegistry } = await import("../utils/registry");
const { handleComponentInteraction } = await import("./component-actions");
const guild = "123456789012345690",
	user = "123456789012345691";
let token = "";
beforeEach(() => {
	evictGuild.mockClear();
	token = guildRegistry.register(guild, null);
});
afterEach(() => guildRegistry.unregister(guild));
function interaction(command: string, action: string, actor = user): ButtonInteraction {
	return {
		customId: `memeover:${command}:${action}:${guild}:${user}`,
		user: { id: actor },
		guildId: guild,
		memberPermissions: { has: () => true },
		locale: "en",
		update: mock(async () => {}),
		reply: mock(async () => {}),
	} as unknown as ButtonInteraction;
}
test("rotate confirm updates registry before evicting", async () => {
	await handleComponentInteraction(interaction("rotate", "confirm"));
	expect(guildRegistry.getConfig(guild)?.token).not.toBe(token);
	expect(evictGuild).toHaveBeenCalledWith(
		guild,
		"TOKEN_ROTATED",
		expect.any(String),
		expect.any(String),
	);
	expect(evictGuild).toHaveBeenCalledTimes(1);
});
test("rotate cancellation does not evict", async () => {
	await handleComponentInteraction(interaction("rotate", "cancel"));
	expect(guildRegistry.getConfig(guild)?.token).toBe(token);
	expect(evictGuild).not.toHaveBeenCalled();
});
test("remove confirm deletes registry and evicts", async () => {
	await handleComponentInteraction(interaction("remove", "confirm"));
	expect(guildRegistry.isRegistered(guild)).toBe(false);
	expect(evictGuild).toHaveBeenCalledWith(
		guild,
		"GUILD_UNREGISTERED",
		expect.any(String),
		expect.any(String),
	);
});
test("wrong user cannot revoke", async () => {
	await handleComponentInteraction(interaction("rotate", "confirm", "other"));
	expect(evictGuild).not.toHaveBeenCalled();
	expect(guildRegistry.getConfig(guild)?.token).toBe(token);
});
