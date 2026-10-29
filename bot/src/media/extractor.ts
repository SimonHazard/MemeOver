import type { Message, PartialMessage } from "discord.js";
import { StickerFormatType } from "discord.js";
import { isAllowedAndFresh, isCdnUrlExpired } from "./allowlist";
import type { ExtractedMedia, MediaType } from "./types";

// ─── URL patterns ─────────────────────────────────────────────────────────────

const GIF_PATTERN = /\.(gif)(\?.*)?$/i;
const IMAGE_PATTERN = /\.(png|jpe?g|webp|bmp|svg)(\?.*)?$/i;
const VIDEO_PATTERN = /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i;
const AUDIO_PATTERN = /\.(mp3|wav|ogg|flac|aac|m4a)(\?.*)?$/i;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalize a URL to its pathname for dedup purposes.
 * Ignores query params so that `file.mp4?ex=A` and `file.mp4?ex=B`
 * are treated as the same media.
 */
export function urlPathname(url: string): string {
	try {
		return new URL(url).pathname;
	} catch {
		return url;
	}
}

/** Detect the media type of a URL based on its file extension. */
export function detectMediaType(url: string): MediaType | null {
	if (GIF_PATTERN.test(url)) return "gif";
	if (IMAGE_PATTERN.test(url)) return "image";
	if (VIDEO_PATTERN.test(url)) return "video";
	if (AUDIO_PATTERN.test(url)) return "audio";
	return null;
}

export const CAPTION_MAX_LENGTH = 140;

export function detectAttachmentMediaType(
	contentType: string | null | undefined,
	url: string,
): MediaType | null {
	const ct = contentType ?? "";
	if (ct.startsWith("image/gif")) return "gif";
	if (ct.startsWith("image/")) return "image";
	if (ct.startsWith("video/")) return "video";
	if (ct.startsWith("audio/")) return "audio";
	return detectMediaType(url);
}

export function normalizeCaption(raw: string | null | undefined): string | undefined {
	// Preserve the existing Cc/Cn filtering; format characters (Cf) are retained.
	const text = raw?.replace(/[\p{Cc}\p{Cn}]/gu, "").trim();
	if (!text) return undefined;
	return text.length > CAPTION_MAX_LENGTH
		? `${text.slice(0, CAPTION_MAX_LENGTH).trimEnd()}…`
		: text;
}

// ─── Extraction ───────────────────────────────────────────────────────────────

/**
 * Extract all media items (images, GIFs, videos, audio) from a Discord message.
 * Checks attachments, embeds, and direct URLs in the message content.
 */
export function extractMedia(message: Message | PartialMessage): ExtractedMedia[] {
	const results: ExtractedMedia[] = [];

	// 1. File attachments
	for (const attachment of message.attachments.values()) {
		if (isCdnUrlExpired(attachment.url)) continue;
		const media_type = detectAttachmentMediaType(attachment.contentType, attachment.url);

		if (media_type) {
			results.push({ url: attachment.url, media_type });
		}
	}

	// 2. Embeds (Tenor, Giphy, direct image embeds)
	for (const embed of message.embeds) {
		if (embed.video?.url) {
			if (!isCdnUrlExpired(embed.video.url)) {
				// Discord exposes animated GIF embeds as `gifv`: the transport is
				// generally MP4/WebM, but the user-facing media type is still GIF.
				const media_type: MediaType = embed.data.type === "gifv" ? "gif" : "video";
				results.push({ url: embed.video.url, media_type });
			}
		} else if (embed.image?.url) {
			if (!isCdnUrlExpired(embed.image.url)) {
				const mt = detectMediaType(embed.image.url) ?? "image";
				results.push({ url: embed.image.url, media_type: mt });
			}
		} else if (embed.thumbnail?.url) {
			if (!isCdnUrlExpired(embed.thumbnail.url)) {
				const mt = detectMediaType(embed.thumbnail.url);
				if (mt) results.push({ url: embed.thumbnail.url, media_type: mt });
			}
		}
	}

	// 3. Direct URLs in message content
	// Use pathname-based dedup: Discord CDN URLs for the same file may differ
	// only in query params (time-limited tokens).
	const content = message.content ?? "";
	const urlMatches = content.match(/https?:\/\/\S+/g) ?? [];
	for (const url of urlMatches) {
		const mt = detectMediaType(url);
		if (mt && isAllowedAndFresh(url)) {
			const normalizedPath = urlPathname(url);
			const alreadyCaptured = results.some((r) => urlPathname(r.url) === normalizedPath);
			if (!alreadyCaptured) {
				results.push({ url, media_type: mt });
			}
		}
	}

	return results;
}

/**
 * Extract stickers from a Discord message.
 * Lottie stickers (format type 3) are skipped — unsupported format.
 */
export function extractStickers(message: Message | PartialMessage): ExtractedMedia[] {
	const results: ExtractedMedia[] = [];
	for (const sticker of message.stickers.values()) {
		if (sticker.format === StickerFormatType.Lottie) continue;
		results.push({ url: sticker.url, media_type: "sticker" });
	}
	return results;
}

/** Extract caption text from a message, stripping URLs before normalizing. */
export function extractText(message: Message | PartialMessage): string | undefined {
	return normalizeCaption((message.content ?? "").replace(/https?:\/\/\S+/g, "").trim());
}
