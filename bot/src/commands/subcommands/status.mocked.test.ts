import { afterEach, expect, mock, test } from "bun:test";
import type { ChatInputCommandInteraction, InteractionReplyOptions } from "discord.js";
import { t } from "../../i18n";
import { PAUSE_INDEFINITE } from "../../utils/guild-pause";
import { store } from "../../utils/store";
import type { WSConnection } from "../../utils/types";
import { componentsToJson } from "../response-panel";

mock.module("../../server", () => ({ broadcastToGuild: () => {}, evictGuild: () => 0 }));
const { guildRegistry } = await import("../../utils/registry");
const { handleStatus } = await import("./status");
const guild = "123456789012345671";
const channel = "123456789012345672";
afterEach(() => {
	guildRegistry.unregister(guild);
	store.removeClient("status-test");
});
async function fields() {
	const replies: InteractionReplyOptions[] = [];
	await handleStatus(
		{
			locale: "en-US",
			reply: async (response: InteractionReplyOptions) => {
				replies.push(response);
			},
		} as unknown as ChatInputCommandInteraction,
		guild,
	);
	expect(replies).toHaveLength(1);
	const panels = componentsToJson(replies[0]) as { components: { content?: string }[] }[];
	return panels[0].components.flatMap((component) =>
		component.content ? [component.content] : [],
	);
}
function field(key: Parameters<typeof t>[1], value: string) {
	return `**${t("en", key)}**\n${value}`;
}
test("status reports an unregistered guild", async () => {
	const blocks = await fields();
	expect(blocks).toContain(field("status.registered", t("en", "status.notConfigured")));
	expect(blocks).toContain(field("common.watching", "—"));
	expect(blocks).toContain(field("common.botAppSources", "—"));
	expect(blocks).toContain(field("status.activeOverlays", "0"));
});
test("status reports watched channels, source policy, overlays and pause", async () => {
	guildRegistry.register(guild, channel);
	guildRegistry.setBotAppSources(guild, true);
	guildRegistry.setPausedUntil(guild, PAUSE_INDEFINITE);
	store.addClient("status-test", {} as WSConnection);
	store.joinGuild("status-test", guild);
	const blocks = await fields();
	expect(blocks).toContain(field("status.registered", t("en", "status.registeredYes")));
	expect(blocks).toContain(field("common.watching", `<#${channel}>`));
	expect(blocks).toContain(field("common.botAppSources", t("en", "common.enabled")));
	expect(blocks).toContain(field("status.activeOverlays", "1"));
	expect(blocks).toContain(
		field("status.broadcasting", t("en", "status.broadcastingPausedIndefinite")),
	);
	guildRegistry.setPausedUntil(guild, null);
	expect(await fields()).toContain(
		field("status.broadcasting", t("en", "status.broadcastingActive")),
	);
});
