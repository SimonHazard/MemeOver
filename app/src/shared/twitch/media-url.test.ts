import { expect, test } from "bun:test";
import {
	cleanTwitchText,
	detectMediaType,
	mediaFromChatText,
	TWITCH_MEDIA_HOSTS,
} from "./media-url";

test("accepts only a direct media URL and preserves a cleaned caption", () => {
	for (const [url, mediaType] of [
		["https://i.imgur.com/a.PNG", "image"],
		["https://media.giphy.com/a.gif?x=1", "gif"],
		["https://media.tenor.com/a.mp4", "video"],
		["https://i.imgur.com/a.mp3", "audio"],
	] as const)
		expect(mediaFromChatText(`before ${url} after`)).toEqual({
			url,
			mediaType,
			rest: "before after",
		});
	expect(
		mediaFromChatText("no-link https://evil.test/a.png https://i.imgur.com/a.png caption")?.url,
	).toBe("https://i.imgur.com/a.png");
	expect(cleanTwitchText(" \u0000hello\u0001 ")).toBe("hello");
	expect(cleanTwitchText("x".repeat(200))).toHaveLength(140);
	expect(mediaFromChatText("https://i.imgur.com:443/a.png")?.mediaType).toBe("image");
});
test("rejects schemes, host tricks, credentials, ports and page URLs", () => {
	for (const url of [
		"http://i.imgur.com/a.png",
		"javascript:alert(1)",
		"https://evil.test/a.png",
		"https://i.imgur.com.evil.example/a.png",
		"https://user:pw@i.imgur.com/a.png",
		"https://i.imgur.com:444/a.png",
		"https://tenor.com/a.gif",
		"https://giphy.com/gifs/a",
		"https://i.imgur.com/page?image=a.png",
		"https://cdn.discordapp.com/a.png",
		"invalid",
	])
		expect(mediaFromChatText(url)).toBeNull();
	expect(detectMediaType("https://i.imgur.com/a.png?anything=.mp4")).toBe("image");
	expect(detectMediaType("https://i.imgur.com/a.gif#fragment")).toBe("gif");
});
test("every Twitch media host is allowed in both desktop CSP directives", async () => {
	const config = await Bun.file(
		new URL("../../../src-tauri/tauri.conf.json", import.meta.url),
	).json();
	const directives = (config.app.security.csp as string)
		.split(";")
		.map((part) => part.trim().split(/\s+/));
	for (const kind of ["img-src", "media-src"]) {
		const directive = directives.find(([name]) => name === kind) ?? [];
		for (const host of TWITCH_MEDIA_HOSTS) expect(directive).toContain(`https://${host}`);
	}
});
