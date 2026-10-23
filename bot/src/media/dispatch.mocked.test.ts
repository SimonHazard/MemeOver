import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Message, MessageReaction, User } from "discord.js";

type Broadcast = {
	guildId: string;
	event: Record<string, unknown>;
};

const broadcasts: Broadcast[] = [];
let allowBotAppSources = false;
let pausedUntil: number | null = null;
let nextMessageId = 1;

const isChannelAllowed = mock((guildId: string, channelId: string) => {
	return guildId === "guild-1" && channelId === "channel-1";
});
const getConfig = mock((guildId: string) => {
	if (guildId !== "guild-1") return undefined;
	return {
		token: "token-1",
		paused_until: pausedUntil,
		channel_ids: ["channel-1"],
		allow_bot_app_sources: allowBotAppSources,
		registered_at: 1,
		last_active_at: null,
		unique_client_ids: [],
	};
});
const canBroadcastReaction = mock(() => true);

mock.module("../server", () => ({
	broadcastToGuild: mock((guildId: string, event: Record<string, unknown>) => {
		broadcasts.push({ guildId, event });
	}),
}));

mock.module("../utils/registry", () => ({
	guildRegistry: {
		isChannelAllowed,
		getConfig,
	},
}));

mock.module("../utils/reaction-rate-limit", () => ({
	canBroadcastReaction,
}));

const { dispatchMedia, hasNewEmbedMedia } = await import("./dispatcher");
const { dispatchReaction } = await import("./reactions");

function makeAuthor(bot: boolean): Pick<User, "bot" | "displayAvatarURL" | "id" | "username"> {
	return {
		bot,
		displayAvatarURL: () => "https://cdn.example.test/avatar.png",
		id: bot ? "bot-user-1" : "user-1",
		username: bot ? "Meme Bot" : "Human User",
	};
}

function makeMessage({
	bot = false,
	content = "hello from discord",
	attachments = new Map(),
	stickers = new Map(),
	embeds = [],
}: {
	bot?: boolean;
	content?: string;
	attachments?: Map<string, { contentType: string; url: string }>;
	stickers?: Map<string, { format: number; url: string }>;
	embeds?: Record<string, unknown>[];
} = {}): Message {
	return {
		applicationId: null,
		attachments,
		author: makeAuthor(bot),
		channelId: "channel-1",
		content,
		embeds,
		guildId: "guild-1",
		id: `message-${crypto.randomUUID()}-${nextMessageId++}`,
		member: null,
		stickers,
		webhookId: null,
	} as unknown as Message;
}

function makeReaction(): MessageReaction {
	return {
		emoji: {
			animated: false,
			id: null,
			name: "fire",
		},
		message: {
			channelId: "channel-1",
			guildId: "guild-1",
			id: `reaction-message-${nextMessageId++}`,
		},
		partial: false,
	} as unknown as MessageReaction;
}

function makeUser(bot: boolean): Pick<User, "bot" | "id"> {
	return {
		bot,
		id: bot ? "bot-reactor-1" : "user-reactor-1",
	};
}

beforeEach(() => {
	broadcasts.length = 0;
	allowBotAppSources = false;
	pausedUntil = null;
	nextMessageId = 1;
	isChannelAllowed.mockClear();
	getConfig.mockClear();
	canBroadcastReaction.mockClear();
});

describe("bot/app source dispatch gates", () => {
	test("mutes bot/app messages while the guild setting is disabled", () => {
		dispatchMedia(makeMessage({ bot: true }), true);

		expect(broadcasts).toHaveLength(0);
	});

	test("broadcasts bot/app media with source metadata when the guild setting is enabled", () => {
		allowBotAppSources = true;

		dispatchMedia(
			makeMessage({
				bot: true,
				content: "caption",
				attachments: new Map([
					[
						"attachment-1",
						{
							contentType: "image/png",
							url: "https://cdn.discordapp.com/attachments/guild/file.png",
						},
					],
				]),
			}),
			true,
		);

		expect(broadcasts).toHaveLength(1);
		expect(broadcasts[0]?.guildId).toBe("guild-1");
		expect(broadcasts[0]?.event).toMatchObject({
			type: "MEDIA",
			media_type: "image",
			source: "bot_app",
			text: "caption",
		});
	});

	test("broadcasts user messages without source metadata even when bot/app sources are muted", () => {
		dispatchMedia(makeMessage(), true);

		expect(broadcasts).toHaveLength(1);
		expect(broadcasts[0]?.event).toMatchObject({
			type: "TEXT",
			text: "hello from discord",
		});
		expect(broadcasts[0]?.event).not.toHaveProperty("source");
	});

	test("mutes bot/app reactions before rate limiting while the guild setting is disabled", async () => {
		await dispatchReaction(makeReaction(), makeUser(true) as User);

		expect(broadcasts).toHaveLength(0);
		expect(canBroadcastReaction).not.toHaveBeenCalled();
	});

	test("broadcasts bot/app reactions with source metadata when the guild setting is enabled", async () => {
		allowBotAppSources = true;

		await dispatchReaction(makeReaction(), makeUser(true) as User);

		expect(broadcasts).toHaveLength(1);
		expect(broadcasts[0]?.event).toMatchObject({
			type: "REACTION",
			emoji: "fire",
			source: "bot_app",
			user_id: "bot-reactor-1",
		});
	});

	test("broadcasts user reactions without source metadata even when bot/app sources are muted", async () => {
		await dispatchReaction(makeReaction(), makeUser(false) as User);

		expect(broadcasts).toHaveLength(1);
		expect(broadcasts[0]?.event).toMatchObject({
			type: "REACTION",
			emoji: "fire",
			user_id: "user-reactor-1",
		});
		expect(broadcasts[0]?.event).not.toHaveProperty("source");
	});
});

test("text only strips URLs", () => {
	dispatchMedia(makeMessage({ content: "hello https://x/a" }), true);
	expect(broadcasts).toHaveLength(1);
	expect(broadcasts[0].event).toMatchObject({ type: "TEXT", text: "hello" });
});
test("text disabled emits nothing", () => {
	dispatchMedia(makeMessage(), false);
	expect(broadcasts).toEqual([]);
});
for (const format of [1, 3])
	test(`sticker dispatch ${format}`, () => {
		dispatchMedia(
			makeMessage({
				content: "",
				stickers: new Map([["s", { format, url: "https://cdn.discordapp.com/s.png" }]]),
			}),
			false,
		);
		expect(broadcasts).toHaveLength(format === 3 ? 0 : 1);
		if (format === 1)
			expect(broadcasts[0].event).toMatchObject({ type: "MEDIA", media_type: "sticker" });
	});
test("media dedup with two attachments and captions", () => {
	const message = makeMessage({
		content: "caption",
		attachments: new Map([
			["a", { contentType: "image/png", url: "https://cdn.discordapp.com/a.png" }],
			["b", { contentType: "video/mp4", url: "https://cdn.discordapp.com/b.mp4" }],
		]),
	});
	dispatchMedia(message, true);
	dispatchMedia(message, true);
	expect(broadcasts).toHaveLength(2);
	for (const b of broadcasts) expect(b.event).toMatchObject({ type: "MEDIA", text: "caption" });
});
test("unwatched channel dropped", () => {
	isChannelAllowed.mockReturnValueOnce(false);
	dispatchMedia(makeMessage(), true);
	expect(broadcasts).toEqual([]);
});
test("new embed pathname detection", () => {
	expect(
		hasNewEmbedMedia(
			makeMessage({
				content: "",
				embeds: [{ image: { url: "https://cdn.discordapp.com/a.png?x=1" } }],
			}),
		),
	).toBe(true);
	expect(
		hasNewEmbedMedia(
			makeMessage({
				content: "https://cdn.discordapp.com/a.png?x=2",
				embeds: [{ image: { url: "https://cdn.discordapp.com/a.png?x=1" } }],
			}),
		),
	).toBe(false);
});
test("partial reaction fetch failure ignored", async () => {
	const reaction = makeReaction();
	Object.assign(reaction, {
		partial: true,
		fetch: async () => {
			throw new Error("gone");
		},
	});
	await dispatchReaction(reaction, makeUser(false) as User);
	expect(broadcasts).toEqual([]);
});
for (const animated of [true, false])
	test(`custom reaction animated=${animated}`, async () => {
		const reaction = makeReaction();
		Object.assign(reaction.emoji, { animated, id: "123", name: "custom" });
		await dispatchReaction(reaction, makeUser(false) as User);
		expect(broadcasts[0].event).toMatchObject({
			emoji_url: `https://cdn.discordapp.com/emojis/123.${animated ? "gif" : "png"}?size=64&quality=lossless`,
		});
	});
test("unicode reaction has no CDN URL", async () => {
	await dispatchReaction(makeReaction(), makeUser(false) as User);
	// characterization: the event has an undefined URL; JSON serialization omits it.
	expect(broadcasts[0].event.emoji_url).toBeUndefined();
});
test("empty emoji dropped", async () => {
	const reaction = makeReaction();
	Object.assign(reaction.emoji, { name: null, id: null });
	await dispatchReaction(reaction, makeUser(false) as User);
	expect(broadcasts).toEqual([]);
});
test("reaction quota rejects broadcast", async () => {
	canBroadcastReaction.mockReturnValueOnce(false);
	await dispatchReaction(makeReaction(), makeUser(false) as User);
	expect(broadcasts).toEqual([]);
});

test("paused guild drops text, media and reactions before admission", async () => {
	pausedUntil = Date.now() + 60_000;
	dispatchMedia(makeMessage({}), true);
	dispatchMedia(
		makeMessage({
			attachments: new Map([
				["a", { contentType: "image/png", url: "https://cdn.discordapp.com/a.png" }],
			]),
		}),
		true,
	);
	await dispatchReaction(makeReaction(), makeUser(false) as User);
	expect(broadcasts).toHaveLength(0);
	expect(canBroadcastReaction).not.toHaveBeenCalled();
});
test("expired guild pause allows broadcasts", () => {
	pausedUntil = Date.now() - 1;
	dispatchMedia(makeMessage({}), true);
	expect(broadcasts).toHaveLength(1);
});
