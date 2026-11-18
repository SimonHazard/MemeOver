import { describe, expect, test } from "bun:test";
import {
	INITIAL_SESSION,
	isSilent,
	isTrustedReconnectUrl,
	onSessionMessage,
} from "./eventsub-session";

function message(type: string, payload: unknown = {}, id = "id") {
	return JSON.stringify({
		metadata: { message_id: id, message_type: type, subscription_type: "channel.chat.message" },
		payload,
	});
}
const welcome = { session: { id: "session", keepalive_timeout_seconds: 30 } };

describe("EventSub session", () => {
	test("welcome subscribes and bounds silence", () => {
		const result = onSessionMessage(INITIAL_SESSION, message("session_welcome", welcome), 10);
		expect(result.effect).toEqual({ kind: "subscribe", sessionId: "session" });
		expect(result.state).toMatchObject({
			sessionId: "session",
			silenceLimitMs: 35_000,
			lastMessageAt: 10,
		});
		expect(isSilent(result.state, 35_010)).toBe(false);
		expect(isSilent(result.state, 35_011)).toBe(true);
	});
	test("resumed welcome preserves subscriptions", () => {
		expect(
			onSessionMessage(
				{ ...INITIAL_SESSION, resumed: true },
				message("session_welcome", welcome),
				1,
			).effect,
		).toEqual({ kind: "ignore", reason: "keepalive" });
	});
	test("notification and keepalive update the deadline", () => {
		const notification = onSessionMessage(
			INITIAL_SESSION,
			message("notification", { event: { text: "x" } }),
			20,
		);
		expect(notification.effect).toEqual({
			kind: "notification",
			type: "channel.chat.message",
			event: { text: "x" },
		});
		expect(notification.state.lastMessageAt).toBe(20);
		expect(onSessionMessage(INITIAL_SESSION, message("session_keepalive"), 30).effect).toEqual({
			kind: "ignore",
			reason: "keepalive",
		});
	});
	test("reconnect accepts a Twitch endpoint and rejects untrusted URLs", () => {
		const url = "wss://eventsub.wss.twitch.tv/ws?reconnect=x";
		expect(
			onSessionMessage(
				INITIAL_SESSION,
				message("session_reconnect", { session: { reconnect_url: url } }),
				1,
			).effect,
		).toEqual({ kind: "reconnect", url });
		for (const bad of [
			"wss://twitch.tv.evil.test/ws",
			"wss://evil-twitch.tv",
			"https://twitch.tv",
			"wss://user:password@twitch.tv",
			"wss://twitch.tv:123/ws",
			"not a URL",
		]) {
			expect(isTrustedReconnectUrl(bad)).toBe(false);
			expect(
				onSessionMessage(
					INITIAL_SESSION,
					message("session_reconnect", { session: { reconnect_url: bad } }),
					1,
				).effect,
			).toEqual({ kind: "ignore", reason: "invalid" });
		}
	});
	test("revocation exposes only type and status", () => {
		expect(
			onSessionMessage(
				INITIAL_SESSION,
				message("revocation", {
					subscription: { type: "channel.chat.message", status: "authorization_revoked" },
				}),
				1,
			).effect,
		).toEqual({ kind: "revoked", type: "channel.chat.message", status: "authorization_revoked" });
	});
	test("duplicates are ignored and recent ids are bounded", () => {
		const state = {
			...INITIAL_SESSION,
			seenMessageIds: Array.from({ length: 200 }, (_, i) => String(i)),
		};
		const duplicate = onSessionMessage(state, message("session_keepalive", {}, "100"), 40);
		expect(duplicate.effect).toEqual({ kind: "ignore", reason: "duplicate" });
		expect(duplicate.state.lastMessageAt).toBe(40);
		const next = onSessionMessage(state, message("session_keepalive", {}, "new"), 50).state;
		expect(next.seenMessageIds).toHaveLength(200);
		expect(next.seenMessageIds[0]).toBe("1");
	});
	test("malformed or incomplete messages cannot keep a dead connection alive", () => {
		for (const raw of [
			"{",
			"null",
			"{}",
			message("session_welcome", {}),
			message("notification", {}),
		]) {
			const result = onSessionMessage(INITIAL_SESSION, raw, 50);
			expect(result.effect).toEqual({ kind: "ignore", reason: "invalid" });
			expect(result.state.lastMessageAt).toBe(0);
		}
		expect(onSessionMessage(INITIAL_SESSION, message("future_type"), 50).effect).toEqual({
			kind: "ignore",
			reason: "unknown_type",
		});
	});
});
