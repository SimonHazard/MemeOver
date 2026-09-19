import { describe, expect, test } from "bun:test";
import { isVideoBackedGif } from "./media-display";

describe("video-backed GIF detection", () => {
	test("recognizes Discord gifv transports", () => {
		expect(isVideoBackedGif("gif", "https://static.klipy.com/reaction.mp4")).toBe(true);
		expect(isVideoBackedGif("gif", "https://media.tenor.com/reaction.webm?token=1")).toBe(true);
	});

	test("does not change regular GIFs or videos", () => {
		expect(isVideoBackedGif("gif", "https://static.klipy.com/reaction.gif")).toBe(false);
		expect(isVideoBackedGif("video", "https://cdn.discordapp.com/video.mp4")).toBe(false);
	});
});
