import { tryParseUrl } from "@memeover/shared";
import { z } from "zod";

export interface SessionState {
	sessionId: string | null;
	silenceLimitMs: number;
	lastMessageAt: number;
	seenMessageIds: string[];
	resumed: boolean;
}

export type SessionEffect =
	| { kind: "subscribe"; sessionId: string }
	| { kind: "notification"; type: string; event: unknown }
	| { kind: "reconnect"; url: string }
	| { kind: "revoked"; type: string; status: string }
	| { kind: "ignore"; reason: "invalid" | "duplicate" | "keepalive" | "unknown_type" };

export const INITIAL_SESSION: SessionState = {
	sessionId: null,
	silenceLimitMs: 35_000,
	lastMessageAt: 0,
	seenMessageIds: [],
	resumed: false,
};

const envelopeSchema = z.object({
	metadata: z.object({
		message_id: z.string().min(1).max(256),
		message_type: z.string(),
		subscription_type: z.string().optional(),
	}),
	payload: z.unknown(),
});
const welcomeSchema = z.object({
	session: z.object({
		id: z.string().min(1).max(512),
		keepalive_timeout_seconds: z.number().int().min(1).max(600),
	}),
});
const notificationSchema = z.object({ event: z.unknown() });
const reconnectSchema = z.object({ session: z.object({ reconnect_url: z.string() }) });
const revocationSchema = z.object({
	subscription: z.object({ type: z.string(), status: z.string() }),
});

export function isTrustedReconnectUrl(value: string): boolean {
	const url = tryParseUrl(value);
	if (!url) return false;
	return (
		url.protocol === "wss:" &&
		(url.hostname === "twitch.tv" || url.hostname.endsWith(".twitch.tv")) &&
		!url.username &&
		!url.password &&
		!url.port
	);
}

export function onSessionMessage(
	state: SessionState,
	raw: string,
	now: number,
): { state: SessionState; effect: SessionEffect } {
	const invalid = { state, effect: { kind: "ignore", reason: "invalid" } as const };
	let value: unknown;
	try {
		value = JSON.parse(raw);
	} catch {
		return invalid;
	}
	const parsed = envelopeSchema.safeParse(value);
	if (!parsed.success) return invalid;
	const { metadata, payload } = parsed.data;
	let effect: SessionEffect;
	let next = state;
	switch (metadata.message_type) {
		case "session_welcome": {
			const welcome = welcomeSchema.safeParse(payload);
			if (!welcome.success) return invalid;
			next = {
				...state,
				sessionId: welcome.data.session.id,
				silenceLimitMs: welcome.data.session.keepalive_timeout_seconds * 1000 + 5000,
			};
			effect = state.resumed
				? { kind: "ignore", reason: "keepalive" }
				: { kind: "subscribe", sessionId: welcome.data.session.id };
			break;
		}
		case "session_keepalive":
			effect = { kind: "ignore", reason: "keepalive" };
			break;
		case "notification": {
			const notification = notificationSchema.safeParse(payload);
			if (!notification.success || !metadata.subscription_type) return invalid;
			effect = {
				kind: "notification",
				type: metadata.subscription_type,
				event: notification.data.event,
			};
			break;
		}
		case "session_reconnect": {
			const reconnect = reconnectSchema.safeParse(payload);
			if (!reconnect.success || !isTrustedReconnectUrl(reconnect.data.session.reconnect_url)) {
				return invalid;
			}
			effect = { kind: "reconnect", url: reconnect.data.session.reconnect_url };
			break;
		}
		case "revocation": {
			const revocation = revocationSchema.safeParse(payload);
			if (!revocation.success) return invalid;
			effect = { kind: "revoked", ...revocation.data.subscription };
			break;
		}
		default:
			effect = { kind: "ignore", reason: "unknown_type" };
	}
	if (state.seenMessageIds.includes(metadata.message_id)) {
		return {
			state: { ...state, lastMessageAt: now },
			effect: { kind: "ignore", reason: "duplicate" },
		};
	}
	return {
		state: {
			...next,
			lastMessageAt: now,
			seenMessageIds: [...state.seenMessageIds.slice(-199), metadata.message_id],
		},
		effect,
	};
}

export function isSilent(state: SessionState, now: number): boolean {
	return now - state.lastMessageAt > state.silenceLimitMs;
}
