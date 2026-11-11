import { expect, mock, test } from "bun:test";
import type { Interaction } from "discord.js";

const commandPermissions = [
	["setup", true],
	["token", false],
	["rotate", true],
	["remove", true],
	["bots", true],
	["secret", false],
	["status", true],
	["pause", true],
	["resume", true],
	["help", false],
] as const;
const handled: { name: string; guildId: string }[] = [];
for (const [name] of commandPermissions) {
	const exportName = `handle${name[0].toUpperCase()}${name.slice(1)}`;
	mock.module(`./subcommands/${name}`, () => ({
		[exportName]: async (_interaction: Interaction, guildId: string) => {
			handled.push({ name, guildId });
		},
	}));
}
mock.module("./component-actions", () => ({ handleComponentInteraction: async () => false }));
const { handleInteraction, memeover } = await import("./commands");

for (const [name, privileged] of commandPermissions) {
	for (const allowed of [false, true]) {
		test(`${name} ${allowed ? "with" : "without"} ManageGuild permission`, async () => {
			const guildId = "123456789012345678";
			const replies: unknown[] = [];
			const interaction = {
				guildId,
				locale: "en",
				commandName: "memeover",
				isButton: () => false,
				isChatInputCommand: () => true,
				memberPermissions: { has: () => allowed },
				options: { getSubcommand: () => name },
				reply: async (value: unknown) => replies.push(value),
			} as unknown as Interaction;
			handled.length = 0;
			await handleInteraction(interaction);
			if (privileged && !allowed) {
				expect(handled).toEqual([]);
				expect(replies).toHaveLength(1);
			} else {
				expect(handled).toEqual([{ name, guildId }]);
				expect(replies).toEqual([]);
			}
		});
	}
}

test("registered slash commands match the supported routing contract", () => {
	expect(memeover.toJSON().options?.map((option) => option.name)).toEqual(
		commandPermissions.map(([name]) => name),
	);
});
