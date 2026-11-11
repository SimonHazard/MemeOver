import { expect, test } from "bun:test";
import { mediaEventToQueueItem, textEventToQueueItem } from "@/shared/media-factory";
import {
	displayDurationMs,
	displayTimerMs,
	EXIT_RECOVERY_MS,
	isSkipRequest,
	MEDIA_SAFETY_DELAY_MS,
	SYNCED_MEDIA_MAX_MS,
	safetyDelayMs,
	shouldArmDisplayTimer,
	shouldDequeue,
} from "./media-display-decisions";

const common = {
	guild_id: "g",
	channel_id: "c",
	message_id: "m",
	author_id: "a",
	author_username: "u",
	author_avatar_url: "",
	timestamp: 1,
};
const text = textEventToQueueItem({ ...common, type: "TEXT", text: "hi" });
test("synced video and audio are always bounded", () => {
	const synced = { duration: 6, syncMediaDuration: true };
	for (const media_type of ["video", "audio"] as const) {
		const item = mediaEventToQueueItem({
			...common,
			type: "MEDIA",
			media_url: "url",
			media_type,
		});
		expect(displayTimerMs(item, synced, "started")).toBe(SYNCED_MEDIA_MAX_MS);
		expect(displayTimerMs(item, synced, "fallback")).toBe(6_000);
		expect(displayTimerMs(item, { ...synced, syncMediaDuration: false }, "started")).toBe(6_000);
	}
	expect(displayTimerMs(text, synced, "started")).toBe(6_000);
});
for (const type of ["image", "gif", "video", "audio", "sticker"] as const)
	test(`${type} display decisions`, () => {
		const item = mediaEventToQueueItem({
			...common,
			type: "MEDIA",
			media_url: "url",
			media_type: type,
		});
		expect(shouldArmDisplayTimer(item, false)).toBe(true);
		expect(shouldArmDisplayTimer(item, true)).toBe(type !== "video" && type !== "audio");
		expect(safetyDelayMs(item)).toBe(2000);
	});
test("text and null timer characterization", () => {
	expect(shouldArmDisplayTimer(text, true)).toBe(true);
	expect(shouldArmDisplayTimer(null, true)).toBe(true); // characterization
	expect(safetyDelayMs(text)).toBe(0);
});
test("timings remain exact", () => {
	expect(displayDurationMs({ duration: 1 })).toBe(1000);
	expect(displayDurationMs({ duration: 6.5 })).toBe(6500);
	expect(MEDIA_SAFETY_DELAY_MS).toBe(2000);
	expect(EXIT_RECOVERY_MS).toBe(1000);
});
test("skip and dequeue truth tables", () => {
	expect(isSkipRequest(0)).toBe(false);
	expect(isSkipRequest(1)).toBe(true);
	for (const current of [null, text])
		for (const length of [0, 1])
			expect(shouldDequeue(current, length)).toBe(current === null && length > 0);
});
