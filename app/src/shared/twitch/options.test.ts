import { expect, test } from "bun:test";
import { DEFAULT_TWITCH_OPTIONS, normalizeTwitchOptions, TWITCH_ROLES } from "./options";

test("defaults keep viewer commands opt-in and moderator-gated", () => {
	expect(DEFAULT_TWITCH_OPTIONS.enabled).toBe(false);
	expect(DEFAULT_TWITCH_OPTIONS.mediaMinRole).toBe("moderator");
	expect(DEFAULT_TWITCH_OPTIONS.textMinRole).toBe("moderator");
	for (const value of [null, undefined, [], "x", 4])
		expect(normalizeTwitchOptions(value)).toEqual(DEFAULT_TWITCH_OPTIONS);
});
test("normalizes wrong fields independently without coercion", () => {
	expect(
		normalizeTwitchOptions({
			enabled: "true",
			emoteReactions: 0,
			mediaCommand: [],
			textCommand: {},
			alerts: null,
			mediaMinRole: "owner",
			textMinRole: false,
			rewardId: "../bad",
		}),
	).toEqual(DEFAULT_TWITCH_OPTIONS);
	expect(
		normalizeTwitchOptions({
			enabled: true,
			alerts: false,
			mediaMinRole: "everyone",
			rewardId: "a-b123",
			textCommand: "yes",
		}),
	).toEqual({
		...DEFAULT_TWITCH_OPTIONS,
		enabled: true,
		alerts: false,
		mediaMinRole: "everyone",
		rewardId: "a-b123",
	});
	expect(normalizeTwitchOptions({ rewardId: "a".repeat(65) }).rewardId).toBe("");
	for (const role of TWITCH_ROLES)
		expect(normalizeTwitchOptions({ mediaMinRole: role }).mediaMinRole).toBe(role);
});
