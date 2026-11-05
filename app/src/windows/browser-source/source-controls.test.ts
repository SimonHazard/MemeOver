import { beforeEach, describe, expect, test } from "bun:test";
import { encodeSourceControls, type SourceControls } from "@/shared/browser-source";
import { useAppStore } from "@/shared/store";
import { DEFAULT_SETTINGS, type DisplayQueueItem } from "@/shared/types";
import { applySourceControls, controlActions } from "./source-controls";

const author = (id: string) => ({ id, username: "", avatarUrl: "", mutedAt: 0 });
const base: SourceControls = { skip: 2, clear: 1, mutedAuthors: [], hideAnonymous: false };

describe("browser source live controls", () => {
	test("past actions never replay on a page that just loaded, but moderation applies", () => {
		expect(controlActions(null, { ...base, skip: 9, clear: 9 })).toEqual({
			commands: "",
			moderation: true,
		});
	});

	test("nothing changed means nothing happens", () => {
		expect(controlActions(base, { ...base })).toEqual({
			commands: "",
			moderation: false,
		});
	});

	test("each new action is read, and a restarted publisher establishes a fresh baseline", () => {
		expect(controlActions(base, { ...base, skip: 4 }).commands).toBe("ss");
		expect(controlActions(base, { ...base, clear: 2 }).commands).toBe("c");
		expect(controlActions(base, { ...base, skip: 0 }).commands).toBe("");
	});

	test("muting, unmuting and the anonymous choice all count as moderation changes", () => {
		const muted = { ...base, mutedAuthors: [author("1")] };
		expect(controlActions(base, muted).moderation).toBe(true);
		expect(controlActions(muted, base).moderation).toBe(true);
		expect(controlActions(base, { ...base, hideAnonymous: true }).moderation).toBe(true);
	});

	test("the same ids in a new object are not a change", () => {
		const muted = { ...base, mutedAuthors: [author("1")] };
		expect(controlActions(muted, { ...muted, mutedAuthors: [author("1")] }).moderation).toBe(false);
	});
});

describe("applying live controls to a loaded page", () => {
	const item = (id: string, authorId: string, anonymous = false) =>
		({
			type: "TEXT",
			queueId: id,
			guild_id: "g",
			channel_id: "c",
			message_id: id,
			author_id: authorId,
			author_username: "Author",
			author_avatar_url: "",
			text: "Hello",
			timestamp: 1,
			anonymous,
		}) as DisplayQueueItem;
	const state = () => useAppStore.getState();
	const queued = () => state().queue.map((entry) => entry.queueId);
	const apply = (previous: SourceControls | null, next: SourceControls) =>
		applySourceControls(previous, encodeSourceControls(next));
	const batch = (commands: string): SourceControls => ({
		...base,
		skip: base.skip + [...commands].filter((command) => command === "s").length,
		clear: base.clear + [...commands].filter((command) => command === "c").length,
		commandLog: `ssc${commands}`.slice(-64),
	});

	beforeEach(() => {
		useAppStore.setState({
			queue: [item("a", "1"), item("b", "2"), item("c", "secret", true)],
			skipVersion: 0,
			isDisplaying: true,
			currentAuthorId: null,
			settings: DEFAULT_SETTINGS,
		});
	});

	test("the first value sets a baseline without skipping or clearing anything", () => {
		const baseline = apply(null, { ...base, skip: 7, clear: 7 });
		expect(baseline).toMatchObject({ skip: 7, clear: 7 });
		expect(state().skipVersion).toBe(0);
		expect(queued()).toEqual(["a", "b", "c"]);
	});

	test("the desktop's moderation replaces the link's older copy from the first value", () => {
		useAppStore.setState({
			settings: { ...DEFAULT_SETTINGS, mutedAuthors: [author("9")] },
		});
		apply(null, { ...base, mutedAuthors: [author("1")] });
		expect(state().settings.mutedAuthors.map((muted) => muted.id)).toEqual(["1"]);
		expect(queued()).toEqual(["b", "c"]);
	});

	test("a skip passes the current item and keeps the queue", () => {
		apply(base, { ...base, skip: 3 });
		expect(state().skipVersion).toBe(1);
		expect(queued()).toEqual(["a", "b", "c"]);
	});

	test("a clear empties the queue and leaves the current item", () => {
		apply(base, { ...base, clear: 2 });
		expect(queued()).toEqual([]);
		expect(state().skipVersion).toBe(0);
	});

	test("two skips in one check remove the visible item and the next queued item", () => {
		const baseline = apply(base, batch("ss"));
		expect(state().skipVersion).toBe(1);
		expect(queued()).toEqual(["b", "c"]);
		// The next check sees the same commands: nothing is consumed twice.
		apply(baseline, batch("ss"));
		expect(state().skipVersion).toBe(1);
		expect(queued()).toEqual(["b", "c"]);
	});

	test("skip then clear preserves the next item; clear then skip leaves nothing", () => {
		apply(base, batch("sc"));
		expect(queued()).toEqual(["a"]);
		expect(state().skipVersion).toBe(1);
		apply(batch("sc"), batch("sccs"));
		expect(queued()).toEqual([]);
		expect(state().skipVersion).toBe(2);
	});

	test("two skips then clear preserve only the third item in playback order", () => {
		apply(base, batch("ssc"));
		expect(queued()).toEqual(["b"]);
		expect(state().skipVersion).toBe(1);
	});

	test("skips with no visible player consume waiting items without skipping a future meme", () => {
		useAppStore.setState({ isDisplaying: false });
		apply(base, batch("ss"));
		expect(queued()).toEqual(["c"]);
		expect(state().skipVersion).toBe(0);
		useAppStore.setState({ queue: [] });
		apply(batch("ss"), batch("ssss"));
		state().enqueue(item("future", "4"));
		expect(queued()).toEqual(["future"]);
		expect(state().skipVersion).toBe(0);
	});

	test("a source missing more than the retained log discards stale playback", () => {
		apply(base, batch("s".repeat(65)));
		expect(queued()).toEqual([]);
		expect(state().skipVersion).toBe(1);
	});

	test("muting drops the author's queued items and cuts them on screen", () => {
		useAppStore.setState({ currentAuthorId: "1" });
		apply(base, { ...base, mutedAuthors: [author("1")] });
		expect(queued()).toEqual(["b", "c"]);
		expect(state().skipVersion).toBe(1);
	});

	test("hiding anonymous memes drops those queued and cuts the one on screen", () => {
		useAppStore.setState({ currentAuthorId: "secret" });
		apply(base, { ...base, hideAnonymous: true });
		expect(queued()).toEqual(["a", "b"]);
		expect(state().skipVersion).toBe(1);
	});

	test("moderation changes keep the display settings", () => {
		useAppStore.setState({ settings: { ...DEFAULT_SETTINGS, textSize: 40, token: "t" } });
		apply(base, { ...base, mutedAuthors: [author("1")] });
		expect(state().settings).toMatchObject({ textSize: 40, token: "t" });
	});

	test("nothing new leaves the page alone", () => {
		const settings = state().settings;
		apply(base, { ...base });
		expect(state().settings).toBe(settings);
		expect(queued()).toEqual(["a", "b", "c"]);
		expect(state().skipVersion).toBe(0);
	});

	test("a missing or unreadable value keeps what was already applied", () => {
		expect(applySourceControls(base, null)).toBe(base);
		expect(applySourceControls(base, "not base64 json")).toBe(base);
		expect(applySourceControls(null, null)).toBeNull();
		expect(state().skipVersion).toBe(0);
	});
});
