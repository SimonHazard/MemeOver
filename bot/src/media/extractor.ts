import type { Message, PartialMessage } from "discord.js";
import type { ExtractedMedia, MediaType } from "./types";

// ─── Security helpers ─────────────────────────────────────────────────────────

const ALLOWED_MEDIA_HOSTS = new Set([
	"cdn.discordapp.com",
	"media.discordapp.net",
	// Tenor (Google) — media1 subdomain also active
	"tenor.com",
	"media.tenor.com",
	"media1.tenor.com",
	"c.tenor.com",
	// Giphy (Shutterstock) — numbered subdomains media0–media4 for load balancing
	"giphy.com",
	"media.giphy.com",
	"media0.giphy.com",
	"media1.giphy.com",
	"media2.giphy.com",
	"media3.giphy.com",
	"media4.giphy.com",
	"i.imgur.com",
]);

/**
 * Returns true if the Discord CDN URL has an `ex=` expiry param that is in the past.
 * Discord attachment URLs carry three query params: `ex` (expiry, hex Unix seconds),
 * `is` (issued-at, hex Unix seconds), and `hm` (HMAC signature).
 * Ref: https://discord.com/developers/docs/reference#cdn-formatting
 */
function isCdnUrlExpired(url: string): boolean {
	try {
		const ex = new URL(url).searchParams.get("ex");
		if (!ex) return false; // No expiry param → not a time-limited CDN URL
		return parseInt(ex, 16) * 1_000 < Date.now();
	} catch {
		return false;
	}
}

/** Parse once and check both host allowlist and CDN expiry in a single URL parse. */
function isAllowedAndFresh(url: string): boolean {
	try {
		const parsed = new URL(url);
		if (!ALLOWED_MEDIA_HOSTS.has(parsed.hostname)) return false;
		const ex = parsed.searchParams.get("ex");
		if (ex && parseInt(ex, 16) * 1_000 < Date.now()) return false;
		return true;
	} catch {
		return false;
	}
}

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
		const ct = attachment.contentType ?? "";
		let media_type: MediaType | null = null;

		if (ct.startsWith("image/gif")) media_type = "gif";
		else if (ct.startsWith("image/")) media_type = "image";
		else if (ct.startsWith("video/")) media_type = "video";
		else if (ct.startsWith("audio/")) media_type = "audio";
		else media_type = detectMediaType(attachment.url);

		if (media_type) {
			results.push({ url: attachment.url, media_type });
		}
	}

	// 2. Embeds (Tenor, Giphy, direct image embeds)
	for (const embed of message.embeds) {
		if (embed.video?.url) {
			if (!isCdnUrlExpired(embed.video.url))
				results.push({ url: embed.video.url, media_type: "video" });
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

/** Extract caption text from a message, stripping out URLs. Truncated to 140 chars. */
export function extractText(message: Message | PartialMessage): string | undefined {
	const stripped = (message.content ?? "").replace(/https?:\/\/\S+/g, "").trim();
	// Strip Unicode control characters (Cc + Cn categories) that could cause
	// visual spoofing via RTL-override, zero-width joiners, etc.
	const raw = stripped.replace(/[\p{Cc}\p{Cn}]/gu, "").trim();
	if (raw.length === 0) return undefined;
	return raw.length > 140 ? `${raw.slice(0, 140).trimEnd()}…` : raw;
}
