import { expect, test } from "bun:test";
import { isPurged, purgeTwitchQueue } from "./purge";
import type { TwitchPurgeAction } from "./route-twitch-event";

const twitch = { origin: "twitch" as const, message_id: "m1", author_id: "twitch:1" };
const other = { ...twitch, message_id: "m2", author_id: "twitch:2" };
const discord = { message_id: "m1", author_id: "twitch:1" };
test("each purge affects only its matching Twitch content", () => {
	const cases: [TwitchPurgeAction, boolean][] = [
		[{ kind: "purge_message", messageId: "m1" }, false],
		[{ kind: "purge_author", authorId: "twitch:1" }, false],
		[{ kind: "purge_all" }, true],
	];
	for (const [action, all] of cases) {
		const input = [discord, twitch, other];
		expect(purgeTwitchQueue(input, action)).toEqual(all ? [discord] : [discord, other]);
		expect(input).toHaveLength(3);
		expect(isPurged(twitch, action)).toBe(true);
		expect(isPurged(discord, action)).toBe(false);
		expect(isPurged(other, action)).toBe(all);
		expect(isPurged(null, action)).toBe(false);
	}
});
