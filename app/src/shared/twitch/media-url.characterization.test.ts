import { expect, test } from "bun:test";
import { detectMediaType } from "./media-url";

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
