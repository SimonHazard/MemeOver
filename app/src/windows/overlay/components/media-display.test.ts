import { describe, expect, test } from "bun:test";
import { AUTHOR_BADGE_HEIGHT } from "./author-badge";
import { isVideoBackedGif, mediaMaxHeight } from "./media-display";

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

describe("media height fits the screen", () => {
	const layout = {
		boxSize: "90vmin",
		hasBadge: true,
		bgEnabled: false,
		bgPadding: 16,
		bgBorderWidth: 2,
		inlineCaptionSize: null,
	};

	test("reserves room for the author badge above the media", () => {
		expect(mediaMaxHeight(layout)).toBe(
			`min(90vmin, calc(100vh - 4rem - ${AUTHOR_BADGE_HEIGHT} - 8px))`,
		);
	});

	test("anonymous media only keeps the screen margin", () => {
		expect(mediaMaxHeight({ ...layout, hasBadge: false })).toBe(
			"min(90vmin, calc(100vh - 4rem - 0px))",
		);
	});

	test("counts the background padding, border and a two-line inline caption", () => {
		// 2 × (16 + 2) background + ceil(24 × 1.375 × 2) + 8 caption + 8 badge gap
		expect(mediaMaxHeight({ ...layout, bgEnabled: true, inlineCaptionSize: 24 })).toBe(
			`min(90vmin, calc(100vh - 4rem - ${AUTHOR_BADGE_HEIGHT} - 118px))`,
		);
	});
});
