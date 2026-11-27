import type { MediaEvent } from "@memeover/shared";
export type TwitchMediaType = MediaEvent["media_type"];
export const TWITCH_MEDIA_HOSTS: ReadonlySet<string> = new Set([
	"i.imgur.com",
	"media.tenor.com",
	"media1.tenor.com",
	"c.tenor.com",
	"media.giphy.com",
	"media0.giphy.com",
	"media1.giphy.com",
	"media2.giphy.com",
	"media3.giphy.com",
	"media4.giphy.com",
	"i.giphy.com",
	"static.klipy.com",
	"static1.klipy.com",
	"static2.klipy.com",
]);
export function cleanTwitchText(text: string): string {
	return text
		.replace(/[\p{Cc}\p{Cn}]/gu, "")
		.trim()
		.slice(0, 140);
}
const MEDIA_TYPE_PATTERNS: ReadonlyArray<readonly [RegExp, TwitchMediaType]> = [
	[/\.gif$/i, "gif"],
	[/\.(png|jpe?g|webp|bmp|svg)$/i, "image"],
	[/\.(mp4|webm|mov|mkv|avi)$/i, "video"],
	[/\.(mp3|wav|ogg|flac|aac|m4a)$/i, "audio"],
];
export function detectMediaType(url: string): TwitchMediaType | null {
	let pathname: string;
	try {
		pathname = new URL(url).pathname;
	} catch {
		return null;
	}
	for (const [pattern, mediaType] of MEDIA_TYPE_PATTERNS)
		if (pattern.test(pathname)) return mediaType;
	return null;
}
export function mediaFromChatText(
	text: string,
): { url: string; mediaType: TwitchMediaType; rest: string } | null {
	const tokens = text.trim().split(/\s+/);
	for (let index = 0; index < tokens.length; index++) {
		const token = tokens[index];
		try {
			const url = new URL(token);
			if (
				url.protocol !== "https:" ||
				url.username ||
				url.password ||
				url.port ||
				!TWITCH_MEDIA_HOSTS.has(url.hostname)
			)
				continue;
			const mediaType = detectMediaType(token);
			if (mediaType)
				return {
					url: token,
					mediaType,
					rest: cleanTwitchText(tokens.filter((_, i) => i !== index).join(" ")),
				};
		} catch {
			/* A chat token need not be a URL. */
		}
	}
	return null;
}
