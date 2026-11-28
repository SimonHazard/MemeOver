import { expect, test } from "bun:test";
import { detectMediaType, mediaFromChatText, TWITCH_MEDIA_HOSTS } from "./media-url";

// Characterization: pins the exact detectMediaType result for a fixed battery of
// inputs. Expected values were captured from the implementation before the
// table-driven refactor and must stay identical after it.
const CASES: ReadonlyArray<readonly [string, ReturnType<typeof detectMediaType>]> = [
	["https://i.imgur.com/a.gif", "gif"],
	["https://i.imgur.com/a.GIF", "gif"],
	["https://i.imgur.com/a.png", "image"],
	["https://i.imgur.com/a.PNG", "image"],
	["https://i.imgur.com/a.jpg", "image"],
	["https://i.imgur.com/a.jpeg", "image"],
	["https://i.imgur.com/a.webp", "image"],
	["https://i.imgur.com/a.bmp", "image"],
	["https://i.imgur.com/a.svg", "image"],
	["https://i.imgur.com/a.mp4", "video"],
	["https://i.imgur.com/a.webm", "video"],
	["https://i.imgur.com/a.mov", "video"],
	["https://i.imgur.com/a.mkv", "video"],
	["https://i.imgur.com/a.avi", "video"],
	["https://i.imgur.com/a.mp3", "audio"],
	["https://i.imgur.com/a.wav", "audio"],
	["https://i.imgur.com/a.ogg", "audio"],
	["https://i.imgur.com/a.flac", "audio"],
	["https://i.imgur.com/a.aac", "audio"],
	["https://i.imgur.com/a.m4a", "audio"],
	["https://i.imgur.com/a.gifv", null],
	["https://i.imgur.com/a.mp4.gif", "gif"],
	["https://i.imgur.com/a.gif.mp4", "video"],
	["https://i.imgur.com/noext", null],
	["https://i.imgur.com/", null],
	["https://i.imgur.com/a.png?dl=1", "image"],
	["https://i.imgur.com/a.gif#frag", "gif"],
	["https://i.imgur.com/a.png?anything=.mp4", "image"],
	["https://i.imgur.com/.png", "image"],
	["https://i.imgur.com/a.", null],
	["https://i.imgur.com/a.tar.gz", null],
	["", null],
	["not a url", null],
	["https://i.imgur.com/a.svg.exe", null],
	["https://i.imgur.com/a.MP4?X=.gif", "video"],
	["ftp://i.imgur.com/a.png", "image"],
	["https://i.imgur.com/a.jpeg?x=.webp", "image"],
];

for (const [input, expected] of CASES)
	test(`detectMediaType(${JSON.stringify(input)}) === ${JSON.stringify(expected)}`, () => {
		expect(detectMediaType(input)).toBe(expected);
	});

// Characterization: pins the exact Twitch media-host set before sourcing it
// from @memeover/shared. Expected values were captured from the implementation
// as it stands on main.
const EXPECTED_TWITCH_HOSTS = [
	"c.tenor.com",
	"i.giphy.com",
	"i.imgur.com",
	"media.giphy.com",
	"media.tenor.com",
	"media0.giphy.com",
	"media1.giphy.com",
	"media1.tenor.com",
	"media2.giphy.com",
	"media3.giphy.com",
	"media4.giphy.com",
	"static.klipy.com",
	"static1.klipy.com",
	"static2.klipy.com",
];

test("Twitch media hosts are exactly the expected set", () => {
	expect([...TWITCH_MEDIA_HOSTS].sort()).toEqual(EXPECTED_TWITCH_HOSTS);
	expect(TWITCH_MEDIA_HOSTS.size).toBe(14);
});

test("every Twitch media host admits a direct gif URL and keeps the original token", () => {
	for (const host of TWITCH_MEDIA_HOSTS)
		expect(mediaFromChatText(`https://${host}/a.gif`)).toEqual({
			url: `https://${host}/a.gif`,
			mediaType: "gif",
			rest: "",
		});
});

test("chat media pins scheme/host normalization and rejection cases", () => {
	expect(mediaFromChatText("HTTPS://I.IMGUR.COM/A.GIF")).toEqual({
		url: "HTTPS://I.IMGUR.COM/A.GIF",
		mediaType: "gif",
		rest: "",
	});
	for (const text of [
		"https://tenor.com/a.gif",
		"https://giphy.com/gifs/a",
		"https://cdn.discordapp.com/a.png",
		"https://i.imgur.com:444/a.png",
		"https://user:pw@i.imgur.com/a.png",
		"http://i.imgur.com/a.png",
		"not a url",
	])
		expect(mediaFromChatText(text)).toBeNull();
});
