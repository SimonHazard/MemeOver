import {
	type ErrorMessage,
	isSessionRevocationCode,
	ServerMessageSchema,
	type SessionRevocationCode,
} from "@memeover/shared";
import { match } from "ts-pattern";
import { mediaEventToQueueItem, textEventToQueueItem } from "@/shared/media-factory";
import { muteDropReason } from "@/shared/muted-authors";
import type { DisplayQueueItem, EnabledTypes, OverlayHealth } from "@/shared/types";

export type DropReason =
	| "invalid_json"
	| "invalid_schema"
	| "overlay_closed"
	| "bot_app_source"
	| "media_type_disabled"
	| "text_disabled"
	| "reactions_disabled"
	| "other_guild"
	| "author_muted"
	| "anonymous_hidden";
export interface RouteContext {
	overlayHealth: OverlayHealth;
	showBotAppSources: boolean;
	enabledTypes: EnabledTypes;
	floatingReactionsEnabled: boolean;
	guildId: string;
	mutedAuthors?: ReadonlySet<string>;
	hideAnonymous?: boolean;
}
export type OverlayAction =
	| { kind: "join_ack"; success: boolean; error?: string; features?: string[] }
	| { kind: "enqueue"; item: DisplayQueueItem }
	| { kind: "reaction"; emoji: string; emojiUrl?: string }
	| { kind: "server_error"; message: ErrorMessage }
	| { kind: "session_revoked"; code: SessionRevocationCode }
	| { kind: "pong" }
	| { kind: "member_count"; count: number }
	| { kind: "drop"; reason: DropReason; detail?: unknown };
const drop = (reason: DropReason, detail?: unknown): OverlayAction => ({
	kind: "drop",
	reason,
	detail,
});
export function routeServerMessage(raw: string, ctx: RouteContext): OverlayAction {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return drop("invalid_json", raw);
	}
	const result = ServerMessageSchema.safeParse(parsed);
	if (!result.success) return drop("invalid_schema", result.error.issues);
	const gate = (msg: {
		source?: string;
		author_id?: string;
		user_id?: string;
		anonymous?: boolean;
	}): DropReason | null => {
		if (ctx.overlayHealth === "closed") return "overlay_closed";
		const muted = muteDropReason(msg, ctx.mutedAuthors ?? new Set(), ctx.hideAnonymous ?? false);
		if (muted) return muted;
		if (msg.source === "bot_app" && !ctx.showBotAppSources) return "bot_app_source";
		return null;
	};
	return match(result.data)
		.with(
			{ type: "JOIN_ACK" },
			(msg): OverlayAction => ({
				kind: "join_ack",
				success: msg.success,
				error: msg.error,
				features: msg.features,
			}),
		)
		.with({ type: "MEDIA" }, (msg): OverlayAction => {
			const reason = gate(msg);
			if (reason) return drop(reason);
			return ctx.enabledTypes[msg.media_type]
				? { kind: "enqueue", item: mediaEventToQueueItem(msg) }
				: drop("media_type_disabled");
		})
		.with({ type: "TEXT" }, (msg): OverlayAction => {
			const reason = gate(msg);
			if (reason) return drop(reason);
			return ctx.enabledTypes.text
				? { kind: "enqueue", item: textEventToQueueItem(msg) }
				: drop("text_disabled");
		})
		.with({ type: "REACTION" }, (msg): OverlayAction => {
			const reason = gate(msg);
			if (reason) return drop(reason);
			return ctx.floatingReactionsEnabled
				? { kind: "reaction", emoji: msg.emoji, emojiUrl: msg.emoji_url }
				: drop("reactions_disabled");
		})
		.with(
			{ type: "ERROR" },
			(msg): OverlayAction =>
				isSessionRevocationCode(msg.code)
					? { kind: "session_revoked", code: msg.code }
					: { kind: "server_error", message: msg },
		)
		.with({ type: "PING" }, (): OverlayAction => ({ kind: "pong" }))
		.with(
			{ type: "MEMBER_COUNT_UPDATE" },
			(msg): OverlayAction =>
				msg.guild_id === ctx.guildId
					? { kind: "member_count", count: msg.count }
					: drop("other_guild"),
		)
		.exhaustive();
}
