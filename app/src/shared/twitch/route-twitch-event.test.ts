import { expect, test } from "bun:test";
import { DEFAULT_TWITCH_OPTIONS } from "./options";
import {
	routeTwitchEvent,
	type TwitchAction,
	type TwitchDropReason,
	type TwitchRouteContext,
} from "./route-twitch-event";

function ctx(patch: Partial<TwitchRouteContext> = {}): TwitchRouteContext {
	return {
		options: { ...DEFAULT_TWITCH_OPTIONS, enabled: true },
		overlayHealth: "alive",
		enabledTypes: { image: true, gif: true, video: true, audio: true, text: true, sticker: true },
		floatingReactionsEnabled: true,
		mutedAuthors: new Set(),
		now: 123,
		...patch,
	};
}
const chat = {
	broadcaster_user_id: "1",
	chatter_user_id: "2",
	chatter_user_login: "viewer",
	chatter_user_name: "Viewer",
	message_id: "m1",
	message: { text: "hello", fragments: [] },
	badges: [] as { set_id: string }[],
	cheer: null,
	channel_points_custom_reward_id: null,
	source_broadcaster_user_id: null,
};
const notice = {
	broadcaster_user_id: "1",
	chatter_user_id: "2",
	chatter_user_login: "viewer",
	chatter_user_name: "Viewer",
	message_id: "n1",
	chatter_is_anonymous: false,
	system_message: "A subscription",
	message: { text: "hello" },
	notice_type: "sub",
};
const reward = {
	broadcaster_user_id: "1",
	id: "r1",
	user_id: "2",
	user_login: "viewer",
	user_name: "Viewer",
	user_input: "hello",
	reward: { id: "reward-1", title: "Show" },
};
function drop(actions: TwitchAction[], reason: TwitchDropReason) {
	expect(actions).toEqual([{ kind: "drop", reason }]);
}
function item(actions: TwitchAction[]) {
	expect(actions).toHaveLength(1);
	const action = actions[0];
	if (action.kind !== "enqueue") throw new Error("Expected enqueue");
	return action.item;
}
function route(event: unknown = chat, context = ctx()) {
	return routeTwitchEvent("channel.chat.message", event, context);
}
function command(text: string) {
	return { ...chat, badges: [{ set_id: "moderator" }], message: { ...chat.message, text } };
}
test("unknown and invalid events are contained", () => {
	for (const type of ["unknown", "__proto__", "constructor"])
		drop(routeTwitchEvent(type, {}, ctx()), "unknown_type");
	for (const invalid of [
		null,
		{},
		{ ...chat, chatter_user_id: "bad/id" },
		{ ...chat, message_id: "x".repeat(65) },
	])
		drop(route(invalid), "invalid_event");
	expect(() => route({ ...chat, extra_future_field: true })).not.toThrow();
});
test("moderation bypasses enable, closed and mute gates", () => {
	const context = ctx({
		options: DEFAULT_TWITCH_OPTIONS,
		overlayHealth: "closed",
		mutedAuthors: new Set(["twitch:2"]),
	});
	expect(
		routeTwitchEvent(
			"channel.chat.message_delete",
			{ target_user_id: "2", message_id: "m1" },
			context,
		),
	).toEqual([{ kind: "purge_message", messageId: "m1" }]);
	expect(
		routeTwitchEvent("channel.chat.clear_user_messages", { target_user_id: "2" }, context),
	).toEqual([{ kind: "purge_author", authorId: "twitch:2" }]);
	expect(routeTwitchEvent("channel.chat.clear", {}, context)).toEqual([{ kind: "purge_all" }]);
	for (const type of [
		"channel.chat.message_delete",
		"channel.chat.clear_user_messages",
		"channel.chat.clear",
	])
		drop(routeTwitchEvent(type, null, context), "invalid_event");
});
test("ordinary events honour enable and overlay gates", () => {
	drop(route(chat, ctx({ options: DEFAULT_TWITCH_OPTIONS })), "disabled");
	drop(route(chat, ctx({ overlayHealth: "closed" })), "overlay_closed");
	for (const [type, event] of [
		["channel.chat.message", chat],
		["channel.chat.notification", notice],
		["channel.channel_points_custom_reward_redemption.add", reward],
	] as const)
		drop(
			routeTwitchEvent(type, event, ctx({ mutedAuthors: new Set(["twitch:2"]) })),
			"author_muted",
		);
});
test("chat without shared-channel metadata still accepts moderator commands", () => {
	const { source_broadcaster_user_id: _, ...event } = command("!meme https://i.imgur.com/a.png");
	expect(item(route(event))).toMatchObject({ type: "MEDIA", origin: "twitch" });
});
test("shared chat is rejected and reward chat is not displayed twice", () => {
	drop(route({ ...chat, source_broadcaster_user_id: "3" }), "shared_chat");
	drop(route({ ...chat, channel_points_custom_reward_id: "reward-1" }), "nothing_to_show");
});
test("media commands require the configured role and enabled media", () => {
	const text = "!MeMe https://i.imgur.com/a.png caption";
	drop(route({ ...chat, message: { ...chat.message, text } }), "role_too_low");
	const result = item(route(command(text)));
	expect(result).toMatchObject({
		type: "MEDIA",
		origin: "twitch",
		media_url: "https://i.imgur.com/a.png",
		text: "caption",
		author_id: "twitch:2",
		author_username: "viewer",
		author_display_name: "Viewer",
		author_avatar_url: "",
		guild_id: "",
		channel_id: "twitch:1",
		message_id: "m1",
		timestamp: 123,
	});
	expect(result.queueId).toBeString();
	drop(
		route(command(text), ctx({ options: { ...ctx().options, mediaCommand: false } })),
		"command_disabled",
	);
	drop(route(command("!meme https://evil.test/a.png")), "no_media");
	drop(
		route(command(text), ctx({ enabledTypes: { ...ctx().enabledTypes, image: false } })),
		"media_type_disabled",
	);
	expect(
		item(
			route(
				{ ...chat, message: { ...chat.message, text } },
				ctx({ options: { ...ctx().options, mediaMinRole: "everyone" } }),
			),
		),
	).toMatchObject({ type: "MEDIA" });
});
test("text commands enforce each gate and clean bounded text", () => {
	drop(route(command("!say hello")), "command_disabled");
	const context = ctx({ options: { ...ctx().options, textCommand: true } });
	drop(
		route({ ...chat, message: { ...chat.message, text: "!say hello" } }, context),
		"role_too_low",
	);
	drop(
		route(command("!say hello"), {
			...context,
			enabledTypes: { ...context.enabledTypes, text: false },
		}),
		"text_disabled",
	);
	drop(route(command("!say \u0000 "), context), "empty");
	expect(item(route(command(`!SAY \u0000${"x".repeat(200)}`), context))).toMatchObject({
		type: "TEXT",
		text: "x".repeat(140),
		origin: "twitch",
	});
});
test("cheers require at least 100 bits and respect alerts and text switches", () => {
	expect(item(route({ ...chat, cheer: { bits: 100 } }))).toMatchObject({
		type: "TEXT",
		text: "hello",
	});
	drop(route({ ...chat, cheer: { bits: 99 } }), "nothing_to_show");
	drop(
		route({ ...chat, cheer: { bits: 100 } }, ctx({ options: { ...ctx().options, alerts: false } })),
		"nothing_to_show",
	);
	drop(
		route(
			{ ...chat, cheer: { bits: 100 } },
			ctx({ enabledTypes: { ...ctx().enabledTypes, text: false } }),
		),
		"nothing_to_show",
	);
});
test("emotes are capped, use safe IDs and select the supported format", () => {
	const emote = {
		type: "emote",
		text: "Kappa",
		emote: { id: "abc_12", format: ["static", "animated"] },
	};
	const event = { ...chat, message: { ...chat.message, fragments: Array(5).fill(emote) } };
	expect(route(event)).toHaveLength(3);
	expect(route(event)[0]).toEqual({
		kind: "reaction",
		emoji: "Kappa",
		emojiUrl: "https://static-cdn.jtvnw.net/emoticons/v2/abc_12/animated/dark/2.0",
	});
	expect(
		route({
			...event,
			message: { text: "Kappa", fragments: [{ ...emote, emote: { id: "1", format: ["static"] } }] },
		})[0],
	).toMatchObject({ emojiUrl: "https://static-cdn.jtvnw.net/emoticons/v2/1/static/dark/2.0" });
	drop(
		route({
			...event,
			message: { text: "Kappa", fragments: [{ ...emote, emote: { id: "../evil", format: [] } }] },
		}),
		"invalid_event",
	);
	drop(
		route(event, ctx({ options: { ...ctx().options, emoteReactions: false } })),
		"reactions_disabled",
	);
	drop(route(event, ctx({ floatingReactionsEnabled: false })), "reactions_disabled");
	drop(route(), "nothing_to_show");
});
test("only the selected reward displays media or cleaned text, without role gates", () => {
	const type = "channel.channel_points_custom_reward_redemption.add";
	drop(routeTwitchEvent(type, reward, ctx()), "other_reward");
	const context = ctx({ options: { ...ctx().options, rewardId: "reward-1" } });
	expect(item(routeTwitchEvent(type, reward, context))).toMatchObject({
		type: "TEXT",
		text: "hello",
		message_id: "r1",
	});
	expect(
		item(
			routeTwitchEvent(type, { ...reward, user_input: "https://i.imgur.com/a.png yay" }, context),
		),
	).toMatchObject({ type: "MEDIA", text: "yay" });
	drop(routeTwitchEvent(type, { ...reward, user_input: " " }, context), "empty");
	drop(
		routeTwitchEvent(type, reward, {
			...context,
			enabledTypes: { ...context.enabledTypes, text: false },
		}),
		"empty",
	);
	drop(
		routeTwitchEvent(type, { ...reward, reward: { ...reward.reward, id: "another" } }, context),
		"other_reward",
	);
	drop(routeTwitchEvent(type, {}, context), "invalid_event");
});
test("notice allowlist, anonymous identity and bounded presentation", () => {
	const type = "channel.chat.notification";
	for (const notice_type of ["sub", "resub", "sub_gift", "community_sub_gift", "raid"])
		expect(item(routeTwitchEvent(type, { ...notice, notice_type }, ctx()))).toMatchObject({
			type: "TEXT",
			text: "A subscription — hello",
		});
	expect(
		item(routeTwitchEvent(type, { ...notice, notice_type: "announcement" }, ctx())),
	).toMatchObject({ text: "hello" });
	expect(
		item(routeTwitchEvent(type, { ...notice, chatter_is_anonymous: true }, ctx())),
	).toMatchObject({ author_id: "twitch:anonymous", author_username: "anonymous" });
	drop(
		routeTwitchEvent(type, notice, ctx({ options: { ...ctx().options, alerts: false } })),
		"alerts_disabled",
	);
	drop(routeTwitchEvent(type, { ...notice, notice_type: "future_type" }, ctx()), "nothing_to_show");
	drop(
		routeTwitchEvent(type, notice, ctx({ enabledTypes: { ...ctx().enabledTypes, text: false } })),
		"text_disabled",
	);
	drop(routeTwitchEvent(type, {}, ctx()), "invalid_event");
});
