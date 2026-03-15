import type { Message, PartialMessage } from "discord.js";
import { broadcastToGuild } from "../server";
import { guildRegistry } from "../utils/registry";
import type { MediaEvent, TextEvent } from "../utils/types";
import { extractMedia, extractStickers, extractText, urlPathname } from "./extractor";

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

	console.log(
		`[Bot] Processing message in guild ${guildId}, channel ${channelId} (includeText=${includeText})`,
	);

	// ── Author info ───────────────────────────────────────────────────────────
	const author = message.author;
	const member = message.member;
	const author_username = author.username;
	// Only set display_name when it differs from the username (avoids redundancy)
	const memberDisplayName = member?.displayName;
	const author_display_name =
		memberDisplayName && memberDisplayName !== author_username ? memberDisplayName : undefined;
	// Prefer server-specific avatar; fallback to global avatar
	const author_avatar_url =
		member?.displayAvatarURL({ size: 64 }) ?? author.displayAvatarURL({ size: 64 });

	const mediaItems = extractMedia(message);
	const activeItems = mediaItems.length > 0 ? mediaItems : extractStickers(message);

	if (activeItems.length === 0 && !includeText) return;

	const text = includeText ? extractText(message) : undefined;

	if (activeItems.length === 0) {
		if (!text) return; // No media and no text → ignore
		// No media, but text is allowed — send a text-only event
		const event: TextEvent = {
			type: "TEXT",
			guild_id: guildId,
			channel_id: channelId,
			message_id: message.id,
			author_id: author.id,
			author_username,
			author_display_name,
			author_avatar_url,
			text,
			timestamp: Date.now(),
		};
		broadcastToGuild(guildId, event);
		console.log(`[Bot] Broadcast text-only message to guild ${guildId}: "${text}"`);
		return;
	}

	for (const item of activeItems) {
		const event: MediaEvent = {
			type: "MEDIA",
			guild_id: guildId,
			channel_id: channelId,
			message_id: message.id,
			author_id: author.id,
			author_username,
			author_display_name,
			author_avatar_url,
			media_url: item.url,
			media_type: item.media_type,
			text,
			timestamp: Date.now(),
		};
		broadcastToGuild(guildId, event);
		console.log(
			`[Bot] Broadcast ${item.media_type} to guild ${guildId}: ${item.url}${text ? ` (text: "${text}")` : ""}`,
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
