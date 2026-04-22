import type { Message, PartialMessage } from "discord.js";
import { broadcastToGuild } from "../server";
import { logger } from "../utils/logger";
import { guildRegistry } from "../utils/registry";
import type { MediaEvent, TextEvent } from "../utils/types";
import { shouldDispatch } from "./dedup";
import { extractMedia, extractStickers, extractText, urlPathname } from "./extractor";

const log = logger.child({ module: "dispatcher" });

// ─── Author info ──────────────────────────────────────────────────────────────

interface AuthorInfo {
	author_id: string;
	author_username: string;
	author_display_name?: string;
	author_avatar_url: string;
}

/**
 * Resolve the author fields we broadcast. Server (member) avatar takes priority
 * over the global one; display_name is omitted when equal to the username to
 * avoid duplicate rendering in the overlay badge.
 */
function extractAuthorInfo(message: Message | PartialMessage): AuthorInfo | null {
	const author = message.author;
	if (!author) return null;
	const member = message.member;
	const author_username = author.username;
	const memberDisplayName = member?.displayName;
	const author_display_name =
		memberDisplayName && memberDisplayName !== author_username ? memberDisplayName : undefined;
	const author_avatar_url =
		member?.displayAvatarURL({ size: 64 }) ?? author.displayAvatarURL({ size: 64 });
	return {
		author_id: author.id,
		author_username,
		author_display_name,
		author_avatar_url,
	};
}

// ─── Message dispatch ─────────────────────────────────────────────────────────

/**
 * Process a Discord message: extract media/text, then broadcast events
 * to all overlay clients connected to the message's guild.
 *
 * @param message    The Discord message (or partial) to process
 * @param includeText  Whether to extract and attach caption text to events
 */
export function dispatchMedia(message: Message | PartialMessage, includeText: boolean): void {
	if (!message.guildId || !message.channelId || !message.author) return;
	if (message.author.bot) return;

	const guildId = message.guildId;
	const channelId = message.channelId;

	if (!guildRegistry.isChannelAllowed(guildId, channelId)) return;

	const msgLog = log.child({ guildId, channelId });
	msgLog.debug({ event: "processing", includeText }, "Processing message");

	const authorInfo = extractAuthorInfo(message);
	if (!authorInfo) return;

	const mediaItems = extractMedia(message);
	const activeItems = mediaItems.length > 0 ? mediaItems : extractStickers(message);

	if (activeItems.length === 0 && !includeText) return;

	const text = includeText ? extractText(message) : undefined;

	if (activeItems.length === 0) {
		if (!text) return;
		const event: TextEvent = {
			type: "TEXT",
			guild_id: guildId,
			channel_id: channelId,
			message_id: message.id,
			...authorInfo,
			text,
			timestamp: Date.now(),
		};
		broadcastToGuild(guildId, event);
		msgLog.info({ event: "broadcast_text", text }, "Broadcast text-only message");
		return;
	}

	for (const item of activeItems) {
		// Dedup key pairs message_id with the URL pathname (ignoring query params:
		// Discord CDN regenerates the `ex`/`is`/`hm` params on each fetch, so the
		// same file appears as a fresh URL on each messageUpdate).
		const dedupKey = `${message.id}:${urlPathname(item.url)}`;
		if (!shouldDispatch(dedupKey)) {
			msgLog.debug(
				{ event: "dedup_skip", media_url: item.url, dedupKey },
				"Skipping duplicate media broadcast",
			);
			continue;
		}

		const event: MediaEvent = {
			type: "MEDIA",
			guild_id: guildId,
			channel_id: channelId,
			message_id: message.id,
			...authorInfo,
			media_url: item.url,
			media_type: item.media_type,
			text,
			timestamp: Date.now(),
		};
		broadcastToGuild(guildId, event);
		msgLog.info(
			{ event: "broadcast_media", media_type: item.media_type, media_url: item.url },
			"Broadcast media event",
		);
	}
}

/**
 * Check whether a message update contains genuinely new embed media
 * that wasn't already present as a URL in the message content.
 * Used to avoid duplicate dispatches when Discord populates embeds
 * after the initial message creation (e.g. Tenor/Giphy links).
 */
export function hasNewEmbedMedia(message: Message | PartialMessage): boolean {
	const contentPathnames = new Set(
		((message.content ?? "").match(/https?:\/\/\S+/g) ?? []).map(urlPathname),
	);
	return message.embeds.some((embed) => {
		const url = embed.video?.url ?? embed.image?.url ?? embed.thumbnail?.url;
		return url !== undefined && !contentPathnames.has(urlPathname(url));
	});
}
