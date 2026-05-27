import { type Attachment, type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { isAllowedAndFresh, isCdnUrlExpired } from "../../media/allowlist";
import { shouldDispatch } from "../../media/dedup";
import { detectMediaType, urlPathname } from "../../media/extractor";
import { broadcastToGuild } from "../../server";
import { discordRefLogFields, mediaUrlLogFields } from "../../utils/log-privacy";
import { logger } from "../../utils/logger";
import { guildRegistry } from "../../utils/registry";
import type { MediaEvent, MediaType } from "../../utils/types";
import { errorEmbed, successEmbed } from "../embeds";

const log = logger.child({ module: "secret" });

/** Sentinel author_id for anonymous memes — surfaced in logs, ignored by the overlay (which checks `anonymous`). */
const ANONYMOUS_AUTHOR_ID = "secret";
const SECRET_TEXT_MAX_LENGTH = 140;

function normalizeSecretText(raw: string | null): string | undefined {
	const text = raw?.replace(/[\p{Cc}\p{Cn}]/gu, "").trim();
	if (!text) return undefined;
	return text.length > SECRET_TEXT_MAX_LENGTH
		? `${text.slice(0, SECRET_TEXT_MAX_LENGTH).trimEnd()}…`
		: text;
}

function detectAttachmentMediaType(attachment: Attachment): MediaType | null {
	const contentType = attachment.contentType ?? "";
	if (contentType.startsWith("image/gif")) return "gif";
	if (contentType.startsWith("image/")) return "image";
	if (contentType.startsWith("video/")) return "video";
	if (contentType.startsWith("audio/")) return "audio";
	return detectMediaType(attachment.url);
}

export async function handleSecret(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	if (!guildRegistry.isRegistered(guildId)) {
		const embed = errorEmbed(
			"Not configured",
			"This server has not been set up yet. Run `/memeover setup` first.",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	const attachment = interaction.options.getAttachment("media");
	const rawUrl = interaction.options.getString("url")?.trim() ?? null;
	const text = normalizeSecretText(interaction.options.getString("text"));
	const mediaUrl = attachment?.url ?? rawUrl;

	if (!mediaUrl) {
		const embed = errorEmbed(
			"Media required",
			"Attach a media file or provide a direct URL, then optionally add `text` as the caption.",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	if (attachment && isCdnUrlExpired(attachment.url)) {
		const embed = errorEmbed(
			"Attachment expired",
			"This Discord attachment link has expired. Upload the file again and retry `/memeover secret`.",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	if (!attachment && !isAllowedAndFresh(mediaUrl)) {
		const embed = errorEmbed(
			"URL not allowed",
			"Only links from Discord CDN, Tenor, Giphy, or Imgur are accepted. Paste a direct image/GIF/video URL from one of these hosts.",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	const media_type = attachment ? detectAttachmentMediaType(attachment) : detectMediaType(mediaUrl);
	if (!media_type) {
		const embed = errorEmbed(
			"Unsupported media type",
			"The media must be an image, GIF, video, or audio file (`.png`, `.jpg`, `.gif`, `.mp4`, `.webm`, `.mp3`, …).",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	const channelId = interaction.channelId;
	if (!channelId) {
		const embed = errorEmbed(
			"Channel required",
			"This command must be used inside a text channel.",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	if (!guildRegistry.isChannelAllowed(guildId, channelId)) {
		const embed = errorEmbed(
			"Channel not watched",
			"This channel is not in the MemeOver watch list. Ask a server manager to add it via `/memeover setup #channel`.",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	// Media URL dedup key: each interaction has a unique id, so pairing id+url
	// would never collide. Keying on the URL alone gates anti-spam when the same
	// meme is resubmitted within the TTL window.
	if (!shouldDispatch(`secret:${urlPathname(mediaUrl)}`)) {
		const embed = errorEmbed(
			"Already sent",
			"This exact URL was just pushed. Wait a moment before resending.",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
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

	const embed = successEmbed(
		"Secret meme sent",
		text
			? "Your anonymous meme and caption were pushed to every connected overlay. Nobody sees your name."
			: "Your anonymous meme was pushed to every connected overlay in this server. Nobody sees your name.",
	);
	await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
