import { expect, test } from "bun:test";
import type { ChatInputCommandInteraction, InteractionReplyOptions } from "discord.js";
import { PAUSE_CHOICES } from "../utils/guild-pause";
import { memeover } from "./commands";
import { componentsToJson } from "./response-panel";
import { handleHelp } from "./subcommands/help";

for (const locale of ["en-US", "fr"] as const) {
	test(`help matches the slash builder and pause choices (${locale})`, async () => {
		const replies: InteractionReplyOptions[] = [];
		const interaction = {
			locale,
			reply: async (response: InteractionReplyOptions) => {
				replies.push(response);
			},
		} as unknown as ChatInputCommandInteraction;
		await handleHelp(interaction);
		expect(replies).toHaveLength(1);
		const panels = componentsToJson(replies[0]) as { components: { content?: string }[] }[];
		const blocks = panels[0].components.flatMap((component) =>
			component.content?.startsWith("**/memeover ") ? [component.content] : [],
		);
		const commands = memeover.toJSON().options ?? [];
		expect(blocks).toHaveLength(commands.length);
		for (const command of commands) {
			expect(
				blocks.filter((block) => block.split("**")[1].split(/[ <]/)[1] === command.name),
			).toHaveLength(1);
		}
		const pause = blocks.find((block) => block.startsWith("**/memeover pause "));
		expect(pause?.match(/duration:<([^>]+)>/)?.[1]).toBe(Object.keys(PAUSE_CHOICES).join("|"));
	});
}
