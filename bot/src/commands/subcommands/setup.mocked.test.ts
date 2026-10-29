import { afterEach, expect, mock, test } from "bun:test";
import { buildConnectionCode } from "@memeover/shared";
import type { ChatInputCommandInteraction, InteractionReplyOptions } from "discord.js";
import { config } from "../../utils/config";
import { componentsToJson } from "../response-panel";

mock.module("../../server", () => ({ broadcastToGuild: () => {}, evictGuild: () => 0 }));
const { guildRegistry } = await import("../../utils/registry");
const { handleSetup } = await import("./setup");
const guild = "123456789012345691";
const channel = "123456789012345692";
afterEach(() => {
	guildRegistry.unregister(guild);
});
for (const watched of [channel, null]) {
	test(`setup registers and replies with the connection code (${watched ? "one channel" : "all channels"})`, async () => {
		const replies: InteractionReplyOptions[] = [];
		const interaction = {
			locale: "en-US",
			user: { id: "123456789012345693" },
			options: { getChannel: () => (watched ? { id: watched } : null) },
			reply: async (response: InteractionReplyOptions) => {
				replies.push(response);
			},
		} as unknown as ChatInputCommandInteraction;
		await handleSetup(interaction, guild);
		const cfg = guildRegistry.getConfig(guild);
		expect(cfg?.channel_ids).toEqual(watched ? [watched] : []);
		expect(replies).toHaveLength(1);
		const code = buildConnectionCode({
			guildId: guild,
			token: cfg?.token ?? "",
			wsUrl: config.publicWsUrl,
		});
		const panels = componentsToJson(replies[0]) as { components: { content?: string }[] }[];
		expect(
			panels[0].components.some((component) => component.content?.includes(`\n${code}\n`)),
		).toBe(true);
	});
}
