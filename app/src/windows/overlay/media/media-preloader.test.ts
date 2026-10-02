import { expect, test } from "bun:test";
import type { DisplayQueueItem } from "@/shared/types";
import { gateOutcome } from "../hooks/media-display-decisions";
import {
	createMediaPreloader,
	type PreloaderDeps,
	planPreload,
	withTimeout,
} from "./media-preloader";

function item(id: string, type = "video", url = "https://example.com/a.mp4"): DisplayQueueItem {
	const common = {
		queueId: id,
		guild_id: "g",
		channel_id: "c",
		message_id: id,
		author_id: "a",
		author_username: "A",
		author_avatar_url: "",
		timestamp: 1,
	};
	return type === "text"
		? { ...common, type: "TEXT", text: "hello" }
		: { ...common, type: "MEDIA", media_type: type as "video", media_url: url };
}
function setup(overrides: Partial<PreloaderDeps> = {}) {
	const revoked: string[] = [],
		signals: AbortSignal[] = [];
	let counter = 0,
		fetches = 0,
		warmed = 0;
	const deps: PreloaderDeps = {
		loadImage: async () => {},
		fetchBlob: async (_url, _max, signal) => {
			signals.push(signal);
			fetches++;
			return new Blob(["x"]);
		},
		warmElement: async () => {
			warmed++;
		},
		createObjectURL: () => `blob:${++counter}`,
		revokeObjectURL: (url) => {
			revoked.push(url);
		},
		isExpired: () => false,
		now: () => 0,
		...overrides,
	};
	return {
		preloader: createMediaPreloader(deps),
		revoked,
		signals,
		fetches: () => fetches,
		warmed: () => warmed,
	};
}
test("preload planning includes TEXT, images, stickers and gifv", () => {
	expect(planPreload(item("t", "text"))).toEqual({ kind: "none" });
	for (const type of ["image", "gif", "sticker"])
		expect(planPreload(item(type, type, "https://example.com/a.gif")).kind).toBe("image");
	for (const type of ["video", "audio", "gif"])
		expect(planPreload(item(type, type)).kind).toBe("media");
});
test("image keeps original src; media blob has its own src", async () => {
	const { preloader } = setup();
	const image = item("i", "image");
	expect(await preloader.preload(image)).toEqual({
		status: "ready",
		src: "https://example.com/a.mp4",
	});
	expect(preloader.srcFor("i")).toBe(image.type === "MEDIA" ? image.media_url : "");
	await preloader.preload(item("v"));
	expect(preloader.srcFor("v")).toBe("blob:1");
});
for (const mode of ["throw", "too_large"])
	test(`${mode} falls back to media element`, async () => {
		const { preloader, warmed } = setup({
			fetchBlob: async () => {
				if (mode === "throw") throw new Error("CORS");
				return "too_large";
			},
		});
		expect(await preloader.preload(item("v"))).toEqual({
			status: "ready",
			src: "https://example.com/a.mp4",
		});
		expect(warmed()).toBe(1);
	});
test("expired URL skips work; other failures are load_failed; Discord HTTP failure is expired", async () => {
	const expired = setup({ isExpired: () => true });
	expect(await expired.preloader.preload(item("v"))).toEqual({
		status: "failed",
		reason: "expired_url",
	});
	expect(expired.fetches()).toBe(0);
	const failed = setup({
		fetchBlob: async () => {
			throw { status: 403 };
		},
		warmElement: async () => {
			throw new Error("bad");
		},
	});
	expect(await failed.preloader.preload(item("v"))).toEqual({
		status: "failed",
		reason: "load_failed",
	});
	expect(
		await failed.preloader.preload(
			item("d", "video", "https://cdn.discordapp.com/attachments/a.mp4"),
		),
	).toEqual({ status: "failed", reason: "expired_url" });
});
test("preloading is idempotent", async () => {
	const { preloader, fetches } = setup();
	const a = preloader.preload(item("v")),
		b = preloader.preload(item("v"));
	expect(a).toBe(b);
	await a;
	expect(fetches()).toBe(1);
});
test("LRU evicts and revokes oldest unpinned; pinned media survives clear", async () => {
	const { preloader, revoked, signals } = setup();
	await preloader.preload(item("a"));
	preloader.pin("a");
	await preloader.preload(item("b"));
	await preloader.preload(item("c"));
	await preloader.preload(item("d"));
	expect(preloader.srcFor("a")).toBe("blob:1");
	expect(preloader.srcFor("b")).toBeUndefined();
	expect(revoked).toEqual(["blob:2"]);
	expect(signals[1]?.aborted).toBe(true);
	preloader.clear();
	expect(preloader.srcFor("a")).toBe("blob:1");
	expect(revoked).toEqual(["blob:2", "blob:3", "blob:4"]);
	preloader.unpin("a");
	preloader.clear();
	expect(revoked).toContain("blob:1");
});
test("eviction aborts unfinished work and cannot create a late blob", async () => {
	let resolve: ((blob: Blob) => void) | undefined;
	const state = setup({
		fetchBlob: async () =>
			new Promise<Blob>((r) => {
				resolve = r;
			}),
	});
	const pending = state.preloader.preload(item("pending"));
	state.preloader.clear();
	resolve?.(new Blob(["x"]));
	expect(await pending).toMatchObject({ status: "failed" });
	expect(state.preloader.srcFor("pending")).toBeUndefined();
	expect(state.revoked).toEqual([]);
});
test("timeout bounds the gate without altering ready/failed decisions", async () => {
	expect(await withTimeout(Promise.resolve(1), 10)).toBe(1);
	expect(await withTimeout(new Promise(() => {}), 5)).toBe("timeout");
	expect(gateOutcome("timeout")).toBe("show");
	expect(gateOutcome({ status: "ready", src: "blob:a" })).toBe("show");
	expect(gateOutcome({ status: "failed", reason: "load_failed" })).toBe("skip");
});
