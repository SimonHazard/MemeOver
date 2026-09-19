import { describe, expect, test } from "bun:test";
import type { Message } from "discord.js";
import { ALLOWED_MEDIA_HOSTS, isAllowedAndFresh } from "./allowlist";
import { extractMedia } from "./extractor";

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
