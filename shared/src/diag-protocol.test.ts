import { expect, test } from "bun:test";
import { ClientMessageSchema, ServerMessageSchema } from "./protocol";

const diag = {
	type: "DIAG",
	guild_id: "123456789012345678",
	registered: true,
	all_channels: true,
	channels: [],
	unviewable_channel_count: 0,
	allow_bot_app_sources: false,
	message_content_intent: null,
	overlays_connected: 1,
	client_id: "bot",
};
test("diagnostic request requires a snowflake guild", () => {
	expect(
		ClientMessageSchema.safeParse({ type: "DIAG_REQUEST", guild_id: diag.guild_id }).success,
	).toBe(true);
	expect(ClientMessageSchema.safeParse({ type: "DIAG_REQUEST", guild_id: "bad" }).success).toBe(
		false,
	);
});
test("diagnostics cap channels and strip unknown fields", () => {
	expect(ServerMessageSchema.safeParse(diag).success).toBe(true);
	const channel = {
		id: "c",
		name: "channel",
		missing: false,
		perms: { view: true, history: true },
	};
	expect(
		ServerMessageSchema.safeParse({ ...diag, channels: Array(26).fill(channel) }).success,
	).toBe(false);
	expect(ServerMessageSchema.parse({ ...diag, unexpected: "secret" })).not.toHaveProperty(
		"unexpected",
	);
});
