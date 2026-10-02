import { expect, test } from "bun:test";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { type RouteContext, routeServerMessage } from "./route-server-message";

const ctx = (patch: Partial<RouteContext> = {}): RouteContext => ({
	overlayHealth: "alive",
	showBotAppSources: false,
	enabledTypes: { ...DEFAULT_SETTINGS.enabledTypes },
	floatingReactionsEnabled: true,
	guildId: "123456789012345678",
	...patch,
});
const common = {
	guild_id: "123456789012345678",
	channel_id: "c",
	message_id: "m",
	author_id: "a",
	author_username: "user",
	author_avatar_url: "avatar",
	timestamp: 1,
};
const media = (patch = {}) => ({
	...common,
	type: "MEDIA",
	media_url: "https://example.com/m",
	media_type: "image",
	...patch,
});
const text = () => ({ ...common, type: "TEXT", text: "hello" });
const reaction = (patch = {}) => ({
	type: "REACTION",
	guild_id: common.guild_id,
	channel_id: "c",
	message_id: "m",
	user_id: "a",
	emoji: "👍",
	timestamp: 1,
	...patch,
});
const route = (msg: unknown, context = ctx()) => routeServerMessage(JSON.stringify(msg), context);
test("invalid JSON and schemas have different drop reasons", () => {
	expect(routeServerMessage("not json", ctx())).toEqual({
		kind: "drop",
		reason: "invalid_json",
		detail: "not json",
	});
	expect(route({ type: "NOPE" })).toMatchObject({ reason: "invalid_schema" });
	expect(route({ ...media(), media_url: undefined })).toMatchObject({ reason: "invalid_schema" });
});
for (const make of [media, text, reaction]) {
	test(`closed gate precedes all filters: ${make().type}`, () => {
		expect(
			route(
				{ ...make(), source: "bot_app" },
				ctx({ overlayHealth: "closed", floatingReactionsEnabled: false }),
			),
		).toMatchObject({ reason: "overlay_closed" });
	});
	test(`source filter: ${make().type}`, () => {
		expect(route({ ...make(), source: "bot_app" })).toMatchObject({ reason: "bot_app_source" });
		expect(route({ ...make(), source: "bot_app" }, ctx({ showBotAppSources: true })).kind).not.toBe(
			"drop",
		);
		expect(route({ ...make(), source: "user" }).kind).not.toBe("drop");
		expect(route(make()).kind).not.toBe("drop");
	});
	test(`muted author precedes source: ${make().type}`, () => {
		expect(
			route({ ...make(), source: "bot_app" }, ctx({ mutedAuthors: new Set(["a"]) })),
		).toMatchObject({ reason: "author_muted" });
	});
}
const types = ["image", "gif", "video", "audio", "sticker"] as const;
for (const disabled of types)
	test(`only ${disabled} disabled`, () => {
		const context = ctx({ enabledTypes: { ...DEFAULT_SETTINGS.enabledTypes, [disabled]: false } });
		for (const type of types)
			expect(route(media({ media_type: type }), context)).toMatchObject(
				type === disabled ? { reason: "media_type_disabled" } : { kind: "enqueue" },
			);
		expect(route(media({ media_type: disabled, source: "bot_app" }), context)).toMatchObject({
			reason: "bot_app_source",
		});
	});
test("text and reactions disabled", () => {
	expect(
		route(text(), ctx({ enabledTypes: { ...DEFAULT_SETTINGS.enabledTypes, text: false } })),
	).toMatchObject({ reason: "text_disabled" });
	expect(route(reaction(), ctx({ floatingReactionsEnabled: false }))).toMatchObject({
		reason: "reactions_disabled",
	});
});
test("reaction custom URL and unicode preserved", () => {
	expect(route(reaction())).toEqual({ kind: "reaction", emoji: "👍", emojiUrl: undefined });
	expect(route(reaction({ emoji_url: "custom" }))).toMatchObject({ emojiUrl: "custom" });
});
test("queue factory keeps fields and generates a fresh ID", () => {
	for (const msg of [media(), text()]) {
		const action = route(msg);
		expect(action.kind).toBe("enqueue");
		if (action.kind === "enqueue") {
			expect(action.item).toMatchObject(msg);
			expect(action.item.queueId.length).toBeGreaterThan(0);
			expect(route(msg)).not.toEqual(action);
		}
	}
});
test("control messages route even when overlay closed", () => {
	const context = ctx({ overlayHealth: "closed" });
	expect(
		route(
			{ type: "JOIN_ACK", guild_id: common.guild_id, success: true, features: ["new"] },
			context,
		),
	).toMatchObject({ kind: "join_ack", success: true, features: ["new"] });
	expect(
		route(
			{ type: "JOIN_ACK", guild_id: common.guild_id, success: false, error: "denied" },
			context,
		),
	).toMatchObject({ success: false, error: "denied" });
	expect(route({ type: "PING" }, context)).toEqual({ kind: "pong" });
	const error = { type: "ERROR", code: "PARSE_ERROR", message: "bad" } as const;
	expect(route(error, context)).toEqual({ kind: "server_error", message: error });
	for (const code of ["TOKEN_ROTATED", "GUILD_UNREGISTERED"] as const)
		expect(route({ ...error, code }, context)).toEqual({ kind: "session_revoked", code });
	expect(
		route({ type: "MEMBER_COUNT_UPDATE", guild_id: common.guild_id, count: 2 }, context),
	).toEqual({ kind: "member_count", count: 2 });
	expect(
		route({ type: "MEMBER_COUNT_UPDATE", guild_id: "other", count: 2 }, context),
	).toMatchObject({ reason: "other_guild" });
});
test("anonymous policy follows closed gate and never mutes sentinel individually", () => {
	expect(route(media({ anonymous: true }), ctx({ hideAnonymous: true }))).toMatchObject({
		reason: "anonymous_hidden",
	});
	expect(
		route(media({ author_id: "secret" }), ctx({ mutedAuthors: new Set(["secret"]) })),
	).toMatchObject({ kind: "enqueue" });
});
