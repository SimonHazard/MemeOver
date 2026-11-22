import { z } from "zod";

const userId = z.string().regex(/^\d{1,20}$/);
const messageId = z.string().min(1).max(64);
const rewardId = z.string().regex(/^[A-Za-z0-9-]{1,64}$/);
const chatter = {
	broadcaster_user_id: userId,
	chatter_user_id: userId,
	chatter_user_login: z.string(),
	chatter_user_name: z.string(),
	message_id: messageId,
};
export const ChatMessageSchema = z.object({
	...chatter,
	message: z.object({
		text: z.string(),
		fragments: z.array(
			z.object({
				type: z.string(),
				text: z.string(),
				emote: z
					.object({ id: z.string().regex(/^[A-Za-z0-9_]{1,64}$/), format: z.array(z.string()) })
					.nullable()
					.optional(),
			}),
		),
	}),
	badges: z.array(z.object({ set_id: z.string() })),
	cheer: z.object({ bits: z.number().int().nonnegative() }).nullable(),
	channel_points_custom_reward_id: rewardId.nullable(),
	source_broadcaster_user_id: userId.nullable().default(null),
});
export const ChatNotificationSchema = z.object({
	...chatter,
	chatter_is_anonymous: z.boolean(),
	system_message: z.string(),
	message: z.object({ text: z.string() }),
	notice_type: z.string(),
});
export const ChatMessageDeleteSchema = z.object({ target_user_id: userId, message_id: messageId });
export const ChatClearUserMessagesSchema = z.object({ target_user_id: userId });
export const ChatClearSchema = z.object({});
export const RewardRedemptionSchema = z.object({
	broadcaster_user_id: userId,
	id: messageId,
	user_id: userId,
	user_login: z.string(),
	user_name: z.string(),
	user_input: z.string(),
	reward: z.object({ id: rewardId, title: z.string() }),
});
export const TWITCH_EVENT_SCHEMAS = {
	"channel.chat.message": ChatMessageSchema,
	"channel.chat.notification": ChatNotificationSchema,
	"channel.chat.message_delete": ChatMessageDeleteSchema,
	"channel.chat.clear_user_messages": ChatClearUserMessagesSchema,
	"channel.chat.clear": ChatClearSchema,
	"channel.channel_points_custom_reward_redemption.add": RewardRedemptionSchema,
} as const;
export const TWITCH_SUBSCRIPTION_TYPES = Object.keys(
	TWITCH_EVENT_SCHEMAS,
) as (keyof typeof TWITCH_EVENT_SCHEMAS)[];
