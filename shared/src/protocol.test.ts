import { expect, test } from "bun:test";
import {
	ClientMessageSchema,
	ERROR_CODES,
	isSessionRevocationCode,
	ServerMessageSchema,
	supportsFeature,
} from "./protocol";

const join = { type: "JOIN", guild_id: "1".repeat(17), token: "t" };
test("JOIN optional client identity", () => {
	expect(ClientMessageSchema.safeParse(join).success).toBe(true);
	expect(ClientMessageSchema.safeParse({ ...join, client_id: "12345678" }).success).toBe(true);
});
for (const n of [16, 17, 20, 21])
	test(`snowflake length ${n}`, () =>
		expect(ClientMessageSchema.safeParse({ ...join, guild_id: "1".repeat(n) }).success).toBe(
			n >= 17 && n <= 20,
		));
for (const n of [7, 8, 128, 129])
	test(`client ID length ${n}`, () =>
		expect(ClientMessageSchema.safeParse({ ...join, client_id: "a".repeat(n) }).success).toBe(
			n >= 8 && n <= 128,
		));
test("invalid identity and token", () => {
	expect(ClientMessageSchema.safeParse({ ...join, guild_id: "a".repeat(17) }).success).toBe(false);
	expect(ClientMessageSchema.safeParse({ ...join, token: "" }).success).toBe(false);
});
for (const msg of [{ type: "LEAVE", guild_id: join.guild_id }, { type: "PONG" }])
	test(`client ${msg.type}`, () => expect(ClientMessageSchema.safeParse(msg).success).toBe(true));
const author = {
	guild_id: "g",
	channel_id: "c",
	message_id: "m",
	author_id: "a",
	author_username: "A",
	author_avatar_url: "",
	timestamp: 1,
};
for (const msg of [
	{ ...author, type: "MEDIA", media_url: "url", media_type: "image" },
	{ ...author, type: "TEXT", text: "hello" },
	{ type: "JOIN_ACK", guild_id: "g", success: true },
	{ type: "ERROR", code: "PARSE_ERROR", message: "m" },
	{ type: "PING" },
	{ type: "MEMBER_COUNT_UPDATE", guild_id: "g", count: 0 },
	{
		type: "REACTION",
		guild_id: "g",
		channel_id: "c",
		message_id: "m",
		emoji: "🎉",
		user_id: "u",
		timestamp: 1,
	},
])
	test(`server ${msg.type}`, () => expect(ServerMessageSchema.safeParse(msg).success).toBe(true));
for (const count of [-1, 1.5])
	test(`invalid count ${count}`, () =>
		expect(
			ServerMessageSchema.safeParse({ type: "MEMBER_COUNT_UPDATE", guild_id: "g", count }).success,
		).toBe(false));
test("event source whitelist", () => {
	const msg = { ...author, type: "TEXT", text: "x" };
	expect(ServerMessageSchema.safeParse({ ...msg, source: "bot_app" }).success).toBe(true);
	expect(ServerMessageSchema.safeParse({ ...msg, source: "webhook" }).success).toBe(false);
});
test("unknown message types rejected", () => {
	expect(ClientMessageSchema.safeParse({ type: "ALIEN" }).success).toBe(false);
	expect(ServerMessageSchema.safeParse({ type: "ALIEN" }).success).toBe(false);
});
test("unknown fields stripped and unknown error codes rejected", () => {
	expect(
		ServerMessageSchema.parse({ type: "ERROR", code: "PARSE_ERROR", message: "m", secret: "x" }),
	).toEqual({ type: "ERROR", code: "PARSE_ERROR", message: "m" });
	expect(
		ServerMessageSchema.safeParse({ type: "ERROR", code: "custom", message: "m" }).success,
	).toBe(false);
});

for (const code of ["TOKEN_ROTATED", "GUILD_UNREGISTERED", "PARSE_ERROR", "token_rotated", ""])
	test(`revocation guard ${code}`, () =>
		expect(isSessionRevocationCode(code)).toBe(
			code === "TOKEN_ROTATED" || code === "GUILD_UNREGISTERED",
		));

for (const features of [undefined, [], ["future_thing"]])
	test(`JOIN_ACK features ${features}`, () =>
		expect(
			ServerMessageSchema.safeParse({ type: "JOIN_ACK", guild_id: "g", success: true, features })
				.success,
		).toBe(true));
test("non-string features rejected", () =>
	expect(
		ServerMessageSchema.safeParse({ type: "JOIN_ACK", guild_id: "g", success: true, features: [1] })
			.success,
	).toBe(false));
test("feature support explicit opt in", () => {
	expect(supportsFeature(undefined, "x")).toBe(false);
	expect(supportsFeature([], "x")).toBe(false);
	expect(supportsFeature(["x"], "x")).toBe(true);
	expect(supportsFeature(["x"], "y")).toBe(false);
});
for (const code of ERROR_CODES)
	test(`error code ${code}`, () =>
		expect(ServerMessageSchema.safeParse({ type: "ERROR", code, message: "m" }).success).toBe(
			true,
		));
