import { z } from "zod";

// ─── Shared constants ────────────────────────────────────────────────────────

export const DEFAULT_PUBLIC_WS_URL = "wss://bot-memeover.simonhazard.com/ws";
export const DISCORD_SNOWFLAKE_REGEX = /^\d{17,20}$/;
export const DISCORD_SNOWFLAKE_SEARCH_REGEX = /\b\d{17,20}\b/;

// ─── Media type ───────────────────────────────────────────────────────────────

export const MediaTypeSchema = z.enum(["image", "gif", "video", "audio", "sticker"]);
export type MediaType = z.infer<typeof MediaTypeSchema>;

const EventSourceSchema = z.enum(["user", "bot_app"]);
export type EventSource = z.infer<typeof EventSourceSchema>;

// ─── Server → Client schemas (messages sent by the bot to app clients) ────────

const MediaEventSchema = z.object({
	type: z.literal("MEDIA"),
	guild_id: z.string(),
	channel_id: z.string(),
	message_id: z.string(),
	author_id: z.string(),
	author_username: z.string(),
	author_display_name: z.string().optional(),
	author_avatar_url: z.string(),
	media_url: z.string(),
	media_type: MediaTypeSchema,
	text: z.string().optional(),
	timestamp: z.number(),
	source: EventSourceSchema.optional(),
	/** When true, the overlay should hide all author metadata — used by /memeover secret. */
	anonymous: z.boolean().optional(),
});

const TextEventSchema = z.object({
	type: z.literal("TEXT"),
	guild_id: z.string(),
	channel_id: z.string(),
	message_id: z.string(),
	author_id: z.string(),
	author_username: z.string(),
	author_display_name: z.string().optional(),
	author_avatar_url: z.string(),
	text: z.string(),
	timestamp: z.number(),
	source: EventSourceSchema.optional(),
});

const JoinAckMessageSchema = z.object({
	type: z.literal("JOIN_ACK"),
	guild_id: z.string(),
	success: z.boolean(),
	error: z.string().optional(),
});

const ErrorMessageSchema = z.object({
	type: z.literal("ERROR"),
	code: z.string(),
	message: z.string(),
});

const PingMessageSchema = z.object({
	type: z.literal("PING"),
});

const MemberCountUpdateMessageSchema = z.object({
	type: z.literal("MEMBER_COUNT_UPDATE"),
	guild_id: z.string(),
	count: z.number().int().nonnegative(),
});

const ReactionEventSchema = z.object({
	type: z.literal("REACTION"),
	guild_id: z.string(),
	channel_id: z.string(),
	message_id: z.string(),
	/** Unicode emoji sequence (e.g. "👍", "🔥") OR the name of a custom emoji (for logs/a11y). */
	emoji: z.string(),
	/** CDN URL when the reaction is a custom Discord emoji (static PNG or animated GIF). Absent for unicode emojis. */
	emoji_url: z.string().optional(),
	user_id: z.string(),
	timestamp: z.number(),
	source: EventSourceSchema.optional(),
});

export const ServerMessageSchema = z.discriminatedUnion("type", [
	MediaEventSchema,
	TextEventSchema,
	JoinAckMessageSchema,
	ErrorMessageSchema,
	PingMessageSchema,
	MemberCountUpdateMessageSchema,
	ReactionEventSchema,
]);

export type MediaEvent = z.infer<typeof MediaEventSchema>;
export type TextEvent = z.infer<typeof TextEventSchema>;
export type JoinAckMessage = z.infer<typeof JoinAckMessageSchema>;
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;
export type PingMessage = z.infer<typeof PingMessageSchema>;
export type MemberCountUpdateMessage = z.infer<typeof MemberCountUpdateMessageSchema>;
export type ReactionEvent = z.infer<typeof ReactionEventSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

// ─── Error codes (stricter typing for known error values) ─────────────────────

export type ErrorCode =
	| "PARSE_ERROR"
	| "UNKNOWN_TYPE"
	| "VALIDATION_ERROR"
	| "RATE_LIMITED"
	| "SERVER_SHUTDOWN";

// ─── Client → Server schemas (messages sent by app clients to the bot) ────────

export const DiscordSnowflakeSchema = z.string().regex(DISCORD_SNOWFLAKE_REGEX);

const JoinMessageSchema = z.object({
	type: z.literal("JOIN"),
	guild_id: DiscordSnowflakeSchema,
	token: z.string().min(1),
	client_id: z.string().min(8).max(128).optional(),
});

const LeaveMessageSchema = z.object({
	type: z.literal("LEAVE"),
	guild_id: DiscordSnowflakeSchema,
});

const PongMessageSchema = z.object({
	type: z.literal("PONG"),
});

export const ClientMessageSchema = z.discriminatedUnion("type", [
	JoinMessageSchema,
	LeaveMessageSchema,
	PongMessageSchema,
]);

export type JoinMessage = z.infer<typeof JoinMessageSchema>;
export type LeaveMessage = z.infer<typeof LeaveMessageSchema>;
export type PongMessage = z.infer<typeof PongMessageSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
