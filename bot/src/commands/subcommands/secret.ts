import type { ChatInputCommandInteraction } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import { admitGuildEvent } from "../../media/admission";
import { isAllowedAndFresh, isCdnUrlExpired } from "../../media/allowlist";
import { shouldDispatch } from "../../media/dedup";
import {
	detectAttachmentMediaType,
	detectMediaType,
	normalizeCaption,
	urlPathname,
} from "../../media/extractor";
import { broadcastToGuild } from "../../server";
import { discordRefLogFields, mediaUrlLogFields } from "../../utils/log-privacy";
import { logger } from "../../utils/logger";
import { guildRegistry } from "../../utils/registry";
import type { MediaEvent } from "../../utils/types";
import { notConfiguredResponse } from "../connection";
import { errorResponse, successResponse } from "../response-panel";

const log = logger.child({ module: "secret" });

/** Sentinel author_id for anonymous memes — surfaced in logs, ignored by the overlay (which checks `anonymous`). */
const ANONYMOUS_AUTHOR_ID = "secret";
export async function handleSecret(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const locale = interactionLocale(interaction);
	if (!guildRegistry.isRegistered(guildId)) {
		await interaction.reply(notConfiguredResponse(locale));
		return;
	}

	const attachment = interaction.options.getAttachment("media");
	const rawUrl = interaction.options.getString("url")?.trim() ?? null;
	const text = normalizeCaption(interaction.options.getString("text"));
	const mediaUrl = attachment?.url ?? rawUrl;

	if (!mediaUrl) {
		await interaction.reply(
			errorResponse(
				t(locale, "secret.mediaRequiredTitle"),
				t(locale, "secret.mediaRequiredDescription"),
			),
		);
		return;
	}

	if (attachment && isCdnUrlExpired(attachment.url)) {
		await interaction.reply(
			errorResponse(
				t(locale, "secret.attachmentExpiredTitle"),
				t(locale, "secret.attachmentExpiredDescription"),
			),
		);
		return;
	}

	if (!attachment && !isAllowedAndFresh(mediaUrl)) {
		await interaction.reply(
			errorResponse(
				t(locale, "secret.urlNotAllowedTitle"),
				t(locale, "secret.urlNotAllowedDescription"),
			),
		);
		return;
	}

	const media_type = attachment
		? detectAttachmentMediaType(attachment.contentType, attachment.url)
		: detectMediaType(mediaUrl);
	if (!media_type) {
		await interaction.reply(
			errorResponse(
				t(locale, "secret.unsupportedTypeTitle"),
				t(locale, "secret.unsupportedTypeDescription"),
			),
		);
		return;
	}

	const channelId = interaction.channelId;
	if (!channelId) {
		await interaction.reply(
			errorResponse(
				t(locale, "secret.channelRequiredTitle"),
				t(locale, "secret.channelRequiredDescription"),
			),
		);
		return;
	}

	const verdict = admitGuildEvent({
		channelAllowed: guildRegistry.isChannelAllowed(guildId, channelId),
		config: guildRegistry.getConfig(guildId),
		source: "user",
		now: Date.now(),
		enforceSourcePolicy: false,
	});
	if (verdict === "channel_not_watched") {
		await interaction.reply(
			errorResponse(
				t(locale, "secret.channelNotWatchedTitle"),
				t(locale, "secret.channelNotWatchedDescription"),
			),
		);
		return;
	}

	if (verdict === "paused") {
		await interaction.reply(
			errorResponse(t(locale, "secret.pausedTitle"), t(locale, "secret.pausedDescription")),
		);
		return;
	}
	// Media URL dedup key: each interaction has a unique id, so pairing id+url
	// would never collide. Keying on the URL alone gates anti-spam when the same
	// meme is resubmitted within the TTL window.
	if (!shouldDispatch(`secret:${urlPathname(mediaUrl)}`)) {
		await interaction.reply(
			errorResponse(
				t(locale, "secret.alreadySentTitle"),
				t(locale, "secret.alreadySentDescription"),
			),
		);
		return;
	}

	const event: MediaEvent = {
		type: "MEDIA",
		guild_id: guildId,
		channel_id: channelId,
		message_id: interaction.id,
		author_id: ANONYMOUS_AUTHOR_ID,
		author_username: "",
		author_avatar_url: "",
		media_url: mediaUrl,
		media_type,
		text,
		timestamp: Date.now(),
		anonymous: true,
	};

	broadcastToGuild(guildId, event);
	log.info(
		{
			event: "secret_broadcast",
			...discordRefLogFields({ guildId, channelId, messageId: interaction.id }),
			media_type,
			text_length: text?.length ?? 0,
			...mediaUrlLogFields(mediaUrl),
		},
		"Anonymous meme broadcast",
	);

	await interaction.reply(
		successResponse(
			t(locale, "secret.successTitle"),
			t(locale, text ? "secret.successDescriptionWithText" : "secret.successDescription"),
		),
	);
}
