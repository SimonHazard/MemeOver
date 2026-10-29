import { afterEach, expect, mock, test } from "bun:test";
import type { ChatInputCommandInteraction, InteractionReplyOptions } from "discord.js";
import { t } from "../../i18n";
import type { MediaEvent } from "../../utils/types";
import { notConfiguredResponse } from "../connection";
import { componentsToJson } from "../response-panel";

const broadcasts: { guild: string; event: MediaEvent }[] = [];
mock.module("../../server", () => ({
	broadcastToGuild: (guild: string, event: MediaEvent) => broadcasts.push({ guild, event }),
	evictGuild: () => 0,
}));
const { guildRegistry } = await import("../../utils/registry");
const { handleSecret } = await import("./secret");
const guild = "123456789012345681";
const channel = "123456789012345682";
let sequence = 0;
function interaction() {
	const replies: InteractionReplyOptions[] = [];
	const url = `https://cdn.discordapp.com/attachments/${guild}/${channel}/secret-${sequence++}.png`;
	const value = {
		id: "123456789012345683",
		channelId: channel,
		locale: "en-US",
		user: { id: "123456789012345684" },
		options: {
			getAttachment: () => null,
			getString: (name: string) => (name === "url" ? url : " caption "),
		},
		reply: async (response: InteractionReplyOptions) => {
			replies.push(response);
		},
	} as unknown as ChatInputCommandInteraction;
	return { value, replies, url };
}
function replyText(reply: InteractionReplyOptions) {
	return JSON.stringify(componentsToJson(reply));
}
afterEach(() => {
	guildRegistry.unregister(guild);
	broadcasts.length = 0;
});
test("secret rejects an unregistered guild", async () => {
	const input = interaction();
	await handleSecret(input.value, guild);
	expect(componentsToJson(input.replies[0])).toEqual(componentsToJson(notConfiguredResponse("en")));
	expect(broadcasts).toHaveLength(0);
});
test("secret rejects an unwatched channel", async () => {
	guildRegistry.register(guild, "123456789012345685");
	const input = interaction();
	await handleSecret(input.value, guild);
	expect(replyText(input.replies[0])).toContain(t("en", "secret.channelNotWatchedTitle"));
	expect(broadcasts).toHaveLength(0);
});
test("secret respects guild pause", async () => {
	guildRegistry.register(guild, channel);
	guildRegistry.setPausedUntil(guild, Number.MAX_SAFE_INTEGER);
	const input = interaction();
	await handleSecret(input.value, guild);
	expect(replyText(input.replies[0])).toContain(t("en", "secret.pausedTitle"));
	expect(broadcasts).toHaveLength(0);
});
test("secret broadcasts one anonymous allowlisted media with normalized caption", async () => {
	guildRegistry.register(guild, channel);
	const input = interaction();
	await handleSecret(input.value, guild);
	expect(broadcasts).toHaveLength(1);
	expect(broadcasts[0]).toMatchObject({
		guild,
		event: {
			type: "MEDIA",
			guild_id: guild,
			channel_id: channel,
			media_url: input.url,
			anonymous: true,
			author_id: "secret",
			author_username: "",
			author_avatar_url: "",
			text: "caption",
		},
	});
	expect(replyText(input.replies[0])).toContain(t("en", "secret.successTitle"));
});
test("secret duplicate within the TTL does not broadcast twice", async () => {
	guildRegistry.register(guild, channel);
	const input = interaction();
	await handleSecret(input.value, guild);
	await handleSecret(input.value, guild);
	expect(broadcasts).toHaveLength(1);
	expect(replyText(input.replies[1])).toContain(t("en", "secret.alreadySentTitle"));
});
