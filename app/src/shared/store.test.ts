import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { useAppStore } from "./store";
import { DEFAULT_SETTINGS, type DisplayQueueItem, FLOATING_REACTION_ANIMATIONS } from "./types";

beforeEach(() =>
	useAppStore.setState({
		queue: [],
		reactions: [],
		skipVersion: 0,
		currentAuthorId: null,
		settings: DEFAULT_SETTINGS,
	}),
);
let random: ReturnType<typeof spyOn> | undefined;
afterEach(() => {
	random?.mockRestore();
	random = undefined;
});
function item(id: string): DisplayQueueItem {
	return {
		type: "TEXT",
		queueId: id,
		guild_id: "g",
		channel_id: "c",
		message_id: id,
		author_id: "a",
		author_username: "A",
		author_avatar_url: "",
		text: id,
		timestamp: 1,
	};
}
test("queue overflow drops the newest", () => {
	useAppStore.getState().updateSettings({ maxQueuedPerAuthor: 0 });
	// characterization: full queue rejects item 51, preserving its head.
	for (let i = 0; i < 51; i++) useAppStore.getState().enqueue(item(String(i)));
	expect(useAppStore.getState().queue).toHaveLength(50);
	expect(useAppStore.getState().queue[0].queueId).toBe("0");
	expect(useAppStore.getState().queue.some((q) => q.queueId === "50")).toBe(false);
});
test("dequeue removes head", () => {
	useAppStore.getState().enqueue(item("a"));
	useAppStore.getState().enqueue(item("b"));
	useAppStore.getState().dequeue();
	expect(useAppStore.getState().queue.map((q) => q.queueId)).toEqual(["b"]);
});
test("empty dequeue", () => {
	useAppStore.getState().dequeue();
	expect(useAppStore.getState().queue).toEqual([]);
});
test("clear queue", () => {
	useAppStore.getState().enqueue(item("a"));
	useAppStore.getState().clearQueue();
	expect(useAppStore.getState().queue).toEqual([]);
});
test("skip version increments", () => {
	useAppStore.getState().bumpSkip();
	useAppStore.getState().bumpSkip();
	expect(useAppStore.getState().skipVersion).toBe(2);
});
for (const [value, direction, leftPct] of [
	[0.7, 1, -8],
	[0.2, -1, 108],
] as const)
	test(`bounce spawn ${direction}`, () => {
		random = spyOn(Math, "random").mockReturnValue(value);
		useAppStore.getState().updateSettings({ floatingReactionPreset: "bounce" });
		useAppStore.getState().spawnReaction({ emoji: "🎉" });
		expect(useAppStore.getState().reactions[0]).toMatchObject({
			direction,
			leftPct,
			durationMs: DEFAULT_SETTINGS.floatingReactionDuration * 1000,
			opacityPct: DEFAULT_SETTINGS.floatingReactionOpacity,
			sizeVmin: DEFAULT_SETTINGS.floatingReactionSize,
			fadeInPct: 6,
			fadeOutPct: 90,
		});
	});
test("straight minimum horizontal position", () => {
	random = spyOn(Math, "random").mockReturnValue(0);
	useAppStore.getState().updateSettings({ floatingReactionPreset: "straight" });
	useAppStore.getState().spawnReaction({ emoji: "🎉" });
	expect(useAppStore.getState().reactions[0]).toMatchObject({
		leftPct: 12,
		fadeInPct: 12,
		fadeOutPct: 78,
	});
});
test("random resolves to actual preset", () => {
	useAppStore.getState().spawnReaction({ emoji: "🎉" });
	expect(FLOATING_REACTION_ANIMATIONS).toContain(useAppStore.getState().reactions[0].animation);
});
test("reaction admission retains newest", () => {
	useAppStore.getState().updateSettings({ floatingReactionPreset: "straight" });
	for (let i = 0; i < 40; i++) useAppStore.getState().spawnReaction({ emoji: String(i) });
	const reactions = useAppStore.getState().reactions;
	expect(reactions).toHaveLength(30);
	expect(reactions[29].emoji).toBe("39");
});

test("store enforces author cap while allowing another author and replay", () => {
	for (let i = 0; i < 5; i++) useAppStore.getState().enqueue(item(String(i)));
	expect(useAppStore.getState().queue).toHaveLength(3);
	useAppStore.getState().enqueue({ ...item("other"), author_id: "b" });
	useAppStore.getState().enqueue({ ...item("replay"), replayOf: "old" });
	expect(useAppStore.getState().queue).toHaveLength(5);
});

test("anonymous memes from several senders are all queued", () => {
	for (let i = 0; i < 5; i++)
		useAppStore.getState().enqueue({
			type: "MEDIA",
			queueId: `secret-${i}`,
			guild_id: "g",
			channel_id: "c",
			message_id: `secret-${i}`,
			author_id: "secret",
			author_username: "",
			author_avatar_url: "",
			media_url: `https://cdn.discordapp.com/attachments/1/2/${i}.png`,
			media_type: "image",
			timestamp: 1,
			anonymous: true,
		});
	expect(useAppStore.getState().queue).toHaveLength(5);
});

test("muting removes queued items and skips current author", () => {
	useAppStore.getState().enqueue(item("a"));
	useAppStore.getState().setCurrentAuthorId("a");
	useAppStore
		.getState()
		.updateSettings({ mutedAuthors: [{ id: "a", username: "A", avatarUrl: "", mutedAt: 1 }] });
	expect(useAppStore.getState().queue).toEqual([]);
	expect(useAppStore.getState().skipVersion).toBe(1);
	useAppStore.getState().enqueue(item("next"));
	expect(useAppStore.getState().queue).toEqual([]);
});
