import { describe, expect, test } from "bun:test";
import type { Message } from "discord.js";
import { ALLOWED_MEDIA_HOSTS, isAllowedAndFresh } from "./allowlist";
import {
	detectMediaType,
	extractMedia,
	extractStickers,
	extractText,
	urlPathname,
} from "./extractor";

function makeMessage({
	content = "",
	embeds = [],
}: {
	content?: string;
	embeds?: Array<Record<string, unknown>>;
}): Message {
	return {
		attachments: new Map(),
		content,
		embeds,
		stickers: new Map(),
	} as unknown as Message;
}

describe("GIF extraction", () => {
	test("accepts direct KLIPY media URLs", () => {
		const url = "https://static.klipy.com/ii/example/reaction.gif";

		expect(isAllowedAndFresh(url)).toBe(true);
		expect(extractMedia(makeMessage({ content: url }))).toEqual([{ url, media_type: "gif" }]);
	});

	test("keeps Discord gifv embeds in the GIF category", () => {
		const url = "https://static.klipy.com/ii/example/reaction.mp4";
		const message = makeMessage({
			embeds: [{ data: { type: "gifv" }, video: { url } }],
		});

		expect(extractMedia(message)).toEqual([{ url, media_type: "gif" }]);
	});

	test("keeps ordinary video embeds in the video category", () => {
		const url = "https://cdn.discordapp.com/attachments/example/video.mp4";
		const message = makeMessage({
			embeds: [{ data: { type: "video" }, video: { url } }],
		});

		expect(extractMedia(message)).toEqual([{ url, media_type: "video" }]);
	});
});

describe("desktop CSP", () => {
	test("allows every direct-media host accepted by the bot", async () => {
		const config = await Bun.file(
			new URL("../../../app/src-tauri/tauri.conf.json", import.meta.url),
		).json();
		const csp = config.app.security.csp as string;

		for (const host of ALLOWED_MEDIA_HOSTS) {
			expect(csp).toContain(`https://${host}`);
		}
	});
});

test("URL pathname and invalid fallback", () => {
	expect(urlPathname("https://x/a.png?ex=1")).toBe("/a.png");
	expect(urlPathname("bad")).toBe("bad");
});
for (const [ext, type] of [
	["gif", "gif"],
	["PNG", "image"],
	["jpg", "image"],
	["jpeg", "image"],
	["webp", "image"],
	["bmp", "image"],
	["svg", "image"],
	["mp4", "video"],
	["webm", "video"],
	["mov", "video"],
	["mkv", "video"],
	["avi", "video"],
	["mp3", "audio"],
	["wav", "audio"],
	["ogg", "audio"],
	["flac", "audio"],
	["aac", "audio"],
	["m4a", "audio"],
	["unknown", null],
] as const)
	test(`extension ${ext}`, () =>
		expect(detectMediaType(`https://cdn.discordapp.com/a.${ext}?q=1`)).toBe(type));
for (const [contentType, ext, type] of [
	["image/gif", "bin", "gif"],
	["image/png", "bin", "image"],
	["video/mp4", "bin", "video"],
	["audio/ogg", "bin", "audio"],
	["application/octet-stream", "mp3", "audio"],
] as const)
	test(`attachment ${contentType}`, () => {
		const message = makeMessage({});
		const url = `https://cdn.discordapp.com/a.${ext}`;
		message.attachments = new Map([
			["a", { url, contentType }],
		]) as unknown as Message["attachments"];
		expect(extractMedia(message)).toEqual([{ url, media_type: type }]);
	});
test("expired attachment skipped", () => {
	const message = makeMessage({});
	message.attachments = new Map([
		["a", { url: "https://cdn.discordapp.com/a.png?ex=1", contentType: "image/png" }],
	]) as unknown as Message["attachments"];
	expect(extractMedia(message)).toEqual([]);
});
test("extensionless embed image retained, thumbnail skipped", () => {
	expect(
		extractMedia(
			makeMessage({
				embeds: [{ image: { url: "https://x/image" } }, { thumbnail: { url: "https://x/thumb" } }],
			}),
		),
	).toEqual([{ url: "https://x/image", media_type: "image" }]);
});
test("unknown content host rejected", () =>
	expect(extractMedia(makeMessage({ content: "https://evil.test/a.png" }))).toEqual([]));
test("content and attachment deduplicated by pathname", () => {
	const message = makeMessage({ content: "https://cdn.discordapp.com/a.png?version=2" });
	message.attachments = new Map([
		["a", { url: "https://cdn.discordapp.com/a.png?version=1", contentType: "image/png" }],
	]) as unknown as Message["attachments"];
	expect(extractMedia(message)).toHaveLength(1);
});
for (const format of [1, 2, 3, 4])
	test(`sticker format ${format}`, () => {
		const message = makeMessage({});
		message.stickers = new Map([
			["s", { format, url: "https://cdn.discordapp.com/s.png" }],
		]) as unknown as Message["stickers"];
		expect(extractStickers(message)).toEqual(
			format === 3 ? [] : [{ url: "https://cdn.discordapp.com/s.png", media_type: "sticker" }],
		);
	});
test("URL-only caption omitted", () =>
	expect(extractText(makeMessage({ content: " https://x/a " }))).toBeUndefined());
test("caption control characters stripped", () =>
	expect(extractText(makeMessage({ content: "a\u0000b\u0001c" }))).toBe("abc"));
test("caption truncates at 140 plus ellipsis", () =>
	expect(extractText(makeMessage({ content: "a".repeat(141) }))).toBe(`${"a".repeat(140)}…`));
test("truncated caption trims trailing whitespace", () =>
	expect(extractText(makeMessage({ content: `${"a".repeat(139)} more text` }))).toBe(
		`${"a".repeat(139)}…`,
	));
