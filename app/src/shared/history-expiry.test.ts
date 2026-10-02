import { expect, test } from "bun:test";
import { isMediaExpired, purgeExpired, shouldLogToHistory, toReplayItem } from "./history-expiry";
import type { DisplayQueueItem } from "./types";

const text: DisplayQueueItem = {
	type: "TEXT",
	queueId: "original",
	guild_id: "g",
	channel_id: "c",
	message_id: "m",
	author_id: "a",
	author_username: "A",
	author_avatar_url: "",
	text: "hello",
	timestamp: 1,
};
function media(url: string): DisplayQueueItem {
	return { ...text, type: "MEDIA", media_type: "image", media_url: url };
}
test("TEXT never expires", () => expect(isMediaExpired(text, 1000000)).toBe(false));
test("Discord expiry is conservative", () => {
	expect(isMediaExpired(media("https://cdn.discordapp.com/a?ex=1"), 1000000)).toBe(true);
	expect(isMediaExpired(media("https://media.discordapp.net/a?ex=fff"), 1000000)).toBe(false);
	expect(isMediaExpired(media("https://media.tenor.com/a?ex=1"), 1000000)).toBe(false);
});
test("purge preserves order and counts", () => {
	const fresh = media("https://cdn.discordapp.com/b?ex=fff"),
		old = media("https://cdn.discordapp.com/a?ex=1");
	const input = [old, text, fresh];
	expect(purgeExpired(input, 1000000)).toEqual({ kept: [text, fresh], removed: 1 });
	expect(input).toHaveLength(3);
});
test("replay gets new identity without history timestamp", () => {
	const replay = toReplayItem({ ...text, recordedAt: 99 }, "new");
	expect(replay.queueId).toBe("new");
	expect(replay.replayOf).toBe("original");
	expect(replay).not.toHaveProperty("recordedAt");
	expect(shouldLogToHistory(replay)).toBe(false);
	expect(shouldLogToHistory(text)).toBe(true);
});
