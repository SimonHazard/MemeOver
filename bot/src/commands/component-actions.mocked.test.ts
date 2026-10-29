import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import type { ButtonInteraction } from "discord.js";
import pino from "pino";
import { logHash } from "../utils/log-privacy";

const evictGuild = mock(() => 0);
const logs: Record<string, unknown>[] = [];
mock.module("../server", () => ({ evictGuild, broadcastToGuild: mock() }));
mock.module("../utils/logger", () => ({
	logger: pino({ level: "info" }, { write: (line: string) => logs.push(JSON.parse(line)) }),
}));
const { guildRegistry } = await import("../utils/registry");
const { handleComponentInteraction } = await import("./component-actions");
const guild = "123456789012345690",
	user = "123456789012345691";
const updateError = new Error("Fixture Discord update failed");
let token = "";
beforeEach(() => {
	evictGuild.mockClear();
	logs.length = 0;
	token = guildRegistry.register(guild, null);
});
afterEach(() => guildRegistry.unregister(guild));
function interaction(
	command: string,
	action: string,
	actor = user,
	rejectUpdate = false,
): ButtonInteraction {
	return {
		customId: `memeover:${command}:${action}:${guild}:${user}`,
		user: { id: actor },
		guildId: guild,
		memberPermissions: { has: () => true },
		locale: "en",
		update: mock(async () => {
			if (rejectUpdate) throw updateError;
		}),
		reply: mock(async () => {}),
	} as unknown as ButtonInteraction;
}
function adminLogs() {
	return logs.filter((entry) => entry.module === "component-actions");
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
for (const [command, event] of [
	["rotate", "admin_rotate"],
	["remove", "admin_remove"],
] as const) {
	test(`${command} confirm logs the applied change before a rejected Discord update`, async () => {
		evictGuild.mockReturnValueOnce(2);
		await expect(
			handleComponentInteraction(interaction(command, "confirm", user, true)),
		).rejects.toBe(updateError);
		const rotatedToken = guildRegistry.getConfig(guild)?.token;
		expect(adminLogs()).toEqual([
			expect.objectContaining({
				event,
				guild_hash: logHash(guild),
				actor: logHash(user),
				evicted: 2,
			}),
		]);
		const serialized = JSON.stringify(adminLogs());
		for (const privateValue of [guild, user, token, rotatedToken]) {
			if (privateValue) expect(serialized).not.toContain(privateValue);
		}
	});

	test(`${command} cancellation or a foreign user never logs an applied change`, async () => {
		await handleComponentInteraction(interaction(command, "cancel"));
		await handleComponentInteraction(interaction(command, "confirm", "other"));
		expect(adminLogs()).toEqual([]);
	});
}
