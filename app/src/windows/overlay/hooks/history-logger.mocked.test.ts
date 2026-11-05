import { afterEach, expect, mock, spyOn, test } from "bun:test";
import type { DisplayQueueItem } from "@/shared/types";

const logged: DisplayQueueItem[] = [];
let failure = false;
mock.module("@/shared/history", () => ({
	async addToHistory(item: DisplayQueueItem) {
		if (failure) throw new Error("Simulated store failure");
		logged.push(item);
	},
}));
const { logDisplayedItem } = await import("./history-logger");

const item = {
	type: "TEXT",
	queueId: "1",
	guild_id: "g",
	channel_id: "c",
	message_id: "1",
	author_id: "a",
	author_username: "Author",
	author_avatar_url: "",
	text: "Hello",
	timestamp: 1,
} as DisplayQueueItem;

afterEach(() => {
	logged.length = 0;
	failure = false;
	mock.restore();
});

test("logs a displayed item, but nothing when the stage is empty", () => {
	logDisplayedItem(null);
	expect(logged).toEqual([]);
	logDisplayedItem(item);
	expect(logged).toEqual([item]);
});

test("a replay is not logged a second time", () => {
	logDisplayedItem({ ...item, replayOf: "0" } as DisplayQueueItem);
	expect(logged).toEqual([]);
});

test("a store failure never reaches the stage", async () => {
	const warn = spyOn(console, "warn").mockImplementation(() => {});
	failure = true;
	expect(() => logDisplayedItem(item)).not.toThrow();
	await new Promise((resolve) => setImmediate(resolve));
	expect(warn).toHaveBeenCalled();
});
