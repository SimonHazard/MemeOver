import { mediaEventToQueueItem, textEventToQueueItem } from "../media-factory";
import { muteDropReason } from "../muted-authors";
import type { DisplayQueueItem, EnabledTypes, OverlayHealth } from "../types";
import {
	ChatClearSchema,
	ChatClearUserMessagesSchema,
	ChatMessageDeleteSchema,
	ChatMessageSchema,
	ChatNotificationSchema,
	RewardRedemptionSchema,
} from "./eventsub-events";
import { cleanTwitchText, mediaFromChatText } from "./media-url";
import { TWITCH_MEDIA_COMMAND, TWITCH_TEXT_COMMAND, type TwitchOptions } from "./options";
import { chatterRole, meetsMinimumRole } from "./roles";

export type TwitchDropReason =
	| "unknown_type"
	| "invalid_event"
	| "overlay_closed"
	| "disabled"
	| "shared_chat"
	| "author_muted"
	| "role_too_low"
	| "command_disabled"
	| "no_media"
	| "media_type_disabled"
	| "text_disabled"
	| "empty"
	| "reactions_disabled"
	| "other_reward"
	| "alerts_disabled"
	| "nothing_to_show";
export type TwitchPurgeAction =
	| { kind: "purge_message"; messageId: string }
	| { kind: "purge_author"; authorId: string }
	| { kind: "purge_all" };
export type TwitchAction =
	| { kind: "enqueue"; item: DisplayQueueItem }
	| { kind: "reaction"; emoji: string; emojiUrl: string }
	| TwitchPurgeAction
	| { kind: "drop"; reason: TwitchDropReason };
export interface TwitchRouteContext {
	options: TwitchOptions;
	overlayHealth: OverlayHealth;
	enabledTypes: EnabledTypes;
	floatingReactionsEnabled: boolean;
	mutedAuthors: ReadonlySet<string>;
	now: number;
}
export const MIN_ALERT_BITS = 100;
export const MAX_EMOTES_PER_MESSAGE = 3;
const ALERT_NOTICES = new Set([
	"sub",
	"resub",
	"sub_gift",
	"community_sub_gift",
	"raid",
	"announcement",
]);
const drop = (reason: TwitchDropReason): TwitchAction[] => [{ kind: "drop", reason }];
type Author = { broadcasterId: string; id: string; login: string; name: string; messageId: string };
function itemFields(author: Author, now: number) {
	return {
		guild_id: "",
		channel_id: `twitch:${author.broadcasterId}`,
		message_id: author.messageId,
		author_id: `twitch:${author.id}`,
		author_username: author.login,
		author_display_name: author.name,
		author_avatar_url: "",
		timestamp: now,
	};
}
function enqueueText(author: Author, text: string, ctx: TwitchRouteContext): TwitchAction[] {
	const cleaned = cleanTwitchText(text);
	if (!cleaned) return drop("empty");
	return [
		{
			kind: "enqueue",
			item: {
				...textEventToQueueItem({ ...itemFields(author, ctx.now), type: "TEXT", text: cleaned }),
				origin: "twitch",
			},
		},
	];
}
function enqueueMedia(
	author: Author,
	media: NonNullable<ReturnType<typeof mediaFromChatText>>,
	ctx: TwitchRouteContext,
): TwitchAction[] {
	return [
		{
			kind: "enqueue",
			item: {
				...mediaEventToQueueItem({
					...itemFields(author, ctx.now),
					type: "MEDIA",
					media_url: media.url,
					media_type: media.mediaType,
					text: media.rest || undefined,
				}),
				origin: "twitch",
			},
		},
	];
}
function gate(author: Author, ctx: TwitchRouteContext): TwitchDropReason | null {
	if (!ctx.options.enabled) return "disabled";
	if (ctx.overlayHealth === "closed") return "overlay_closed";
	return muteDropReason({ author_id: `twitch:${author.id}` }, ctx.mutedAuthors, false)
		? "author_muted"
		: null;
}
export function routeTwitchEvent(
	type: string,
	event: unknown,
	ctx: TwitchRouteContext,
): TwitchAction[] {
	// Moderation must still remove queued content after the feature is disabled.
	if (type === "channel.chat.message_delete") {
		const parsed = ChatMessageDeleteSchema.safeParse(event);
		return parsed.success
			? [{ kind: "purge_message", messageId: parsed.data.message_id }]
			: drop("invalid_event");
	}
	if (type === "channel.chat.clear_user_messages") {
		const parsed = ChatClearUserMessagesSchema.safeParse(event);
		return parsed.success
			? [{ kind: "purge_author", authorId: `twitch:${parsed.data.target_user_id}` }]
			: drop("invalid_event");
	}
	if (type === "channel.chat.clear")
		return ChatClearSchema.safeParse(event).success
			? [{ kind: "purge_all" }]
			: drop("invalid_event");
	if (type === "channel.chat.message") {
		const parsed = ChatMessageSchema.safeParse(event);
		if (!parsed.success) return drop("invalid_event");
		const e = parsed.data;
		const author = {
			broadcasterId: e.broadcaster_user_id,
			id: e.chatter_user_id,
			login: e.chatter_user_login,
			name: e.chatter_user_name,
			messageId: e.message_id,
		};
		const reason = gate(author, ctx);
		if (reason) return drop(reason);
		if (
			e.source_broadcaster_user_id !== null &&
			e.source_broadcaster_user_id !== e.broadcaster_user_id
		)
			return drop("shared_chat");
		if (e.channel_points_custom_reward_id !== null) return drop("nothing_to_show");
		const text = e.message.text;
		const role = chatterRole(e.badges.map((badge) => badge.set_id));
		if (text.toLowerCase().startsWith(`${TWITCH_MEDIA_COMMAND} `)) {
			if (!ctx.options.mediaCommand) return drop("command_disabled");
			if (!meetsMinimumRole(role, ctx.options.mediaMinRole)) return drop("role_too_low");
			const media = mediaFromChatText(text.slice(TWITCH_MEDIA_COMMAND.length + 1));
			if (!media) return drop("no_media");
			return ctx.enabledTypes[media.mediaType]
				? enqueueMedia(author, media, ctx)
				: drop("media_type_disabled");
		}
		if (text.toLowerCase().startsWith(`${TWITCH_TEXT_COMMAND} `)) {
			if (!ctx.options.textCommand) return drop("command_disabled");
			if (!meetsMinimumRole(role, ctx.options.textMinRole)) return drop("role_too_low");
			if (!ctx.enabledTypes.text) return drop("text_disabled");
			return enqueueText(author, text.slice(TWITCH_TEXT_COMMAND.length + 1), ctx);
		}
		if (
			e.cheer !== null &&
			e.cheer.bits >= MIN_ALERT_BITS &&
			ctx.options.alerts &&
			ctx.enabledTypes.text
		)
			return enqueueText(author, text, ctx);
		if (!ctx.options.emoteReactions || !ctx.floatingReactionsEnabled)
			return drop("reactions_disabled");
		const reactions: TwitchAction[] = e.message.fragments
			.filter((fragment) => fragment.type === "emote" && fragment.emote)
			.slice(0, MAX_EMOTES_PER_MESSAGE)
			.map((fragment) => ({
				kind: "reaction",
				emoji: fragment.text,
				emojiUrl: `https://static-cdn.jtvnw.net/emoticons/v2/${fragment.emote?.id}/${fragment.emote?.format.includes("animated") ? "animated" : "static"}/dark/2.0`,
			}));
		return reactions.length ? reactions : drop("nothing_to_show");
	}
	if (type === "channel.channel_points_custom_reward_redemption.add") {
		const parsed = RewardRedemptionSchema.safeParse(event);
		if (!parsed.success) return drop("invalid_event");
		const e = parsed.data;
		const author = {
			broadcasterId: e.broadcaster_user_id,
			id: e.user_id,
			login: e.user_login,
			name: e.user_name,
			messageId: e.id,
		};
		const reason = gate(author, ctx);
		if (reason) return drop(reason);
		if (!ctx.options.rewardId || ctx.options.rewardId !== e.reward.id) return drop("other_reward");
		const media = mediaFromChatText(e.user_input);
		if (media && ctx.enabledTypes[media.mediaType]) return enqueueMedia(author, media, ctx);
		return ctx.enabledTypes.text ? enqueueText(author, e.user_input, ctx) : drop("empty");
	}
	if (type === "channel.chat.notification") {
		const parsed = ChatNotificationSchema.safeParse(event);
		if (!parsed.success) return drop("invalid_event");
		const e = parsed.data;
		const author = {
			broadcasterId: e.broadcaster_user_id,
			id: e.chatter_is_anonymous ? "anonymous" : e.chatter_user_id,
			login: e.chatter_is_anonymous ? "anonymous" : e.chatter_user_login,
			name: e.chatter_is_anonymous ? "anonymous" : e.chatter_user_name,
			messageId: e.message_id,
		};
		const reason = gate(author, ctx);
		if (reason) return drop(reason);
		if (!ctx.options.alerts) return drop("alerts_disabled");
		if (!ALERT_NOTICES.has(e.notice_type)) return drop("nothing_to_show");
		if (!ctx.enabledTypes.text) return drop("text_disabled");
		const message = cleanTwitchText(e.message.text);
		return enqueueText(
			author,
			e.notice_type === "announcement"
				? message
				: `${e.system_message}${message ? ` — ${message}` : ""}`,
			ctx,
		);
	}
	return drop("unknown_type");
}
