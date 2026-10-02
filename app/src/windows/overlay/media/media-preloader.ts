import { isDiscordCdnUrl } from "@memeover/shared";
import type { DisplayQueueItem } from "@/shared/types";
import { isVideoBackedGif } from "./media-kind";
export const MEDIA_BLOB_MAX_BYTES = 25 * 1024 * 1024;
export const PRELOAD_GATE_MS = 3000;
export const PRELOAD_LRU = 3;
export type PreloadResult =
	| { status: "ready"; src: string }
	| { status: "failed"; reason: "load_failed" | "expired_url" };
export function planPreload(
	item: DisplayQueueItem,
): { kind: "none" } | { kind: "image" | "media"; url: string } {
	if (item.type === "TEXT") return { kind: "none" };
	return {
		kind:
			item.media_type === "video" ||
			item.media_type === "audio" ||
			isVideoBackedGif(item.media_type, item.media_url)
				? "media"
				: "image",
		url: item.media_url,
	};
}
export interface PreloaderDeps {
	loadImage: (url: string, signal: AbortSignal) => Promise<void>;
	fetchBlob: (url: string, maxBytes: number, signal: AbortSignal) => Promise<Blob | "too_large">;
	warmElement: (url: string, kind: "video" | "audio", signal: AbortSignal) => Promise<void>;
	createObjectURL: (blob: Blob) => string;
	revokeObjectURL: (url: string) => void;
	isExpired: (item: DisplayQueueItem, now: number) => boolean;
	now: () => number;
}
interface Entry {
	promise: Promise<PreloadResult>;
	controller: AbortController;
	pinned: boolean;
	src?: string;
	blob: boolean;
}
export function createMediaPreloader(deps: PreloaderDeps) {
	const entries = new Map<string, Entry>();
	const dispose = (id: string, entry: Entry) => {
		entries.delete(id);
		entry.controller.abort();
		if (entry.blob && entry.src) deps.revokeObjectURL(entry.src);
	};
	const trim = () => {
		while (entries.size > PRELOAD_LRU) {
			const candidate = [...entries].find(([, e]) => !e.pinned);
			if (!candidate) break;
			dispose(...candidate);
		}
	};
	const touch = (id: string, entry: Entry) => {
		entries.delete(id);
		entries.set(id, entry);
	};
	return {
		preload(item: DisplayQueueItem): Promise<PreloadResult> {
			const previous = entries.get(item.queueId);
			if (previous) {
				touch(item.queueId, previous);
				return previous.promise;
			}
			const controller = new AbortController(),
				plan = planPreload(item);
			const entry: Entry = {
				controller,
				pinned: false,
				blob: false,
				promise: Promise.resolve({ status: "failed", reason: "load_failed" }),
			};
			entries.set(item.queueId, entry);
			entry.promise = (async (): Promise<PreloadResult> => {
				let expiredHttp = false;
				try {
					if (plan.kind === "none") return { status: "ready", src: "" };
					if (deps.isExpired(item, deps.now())) return { status: "failed", reason: "expired_url" };
					let src = plan.url;
					if (plan.kind === "image") await deps.loadImage(plan.url, controller.signal);
					else {
						let blob: Blob | "too_large" = "too_large";
						try {
							blob = await deps.fetchBlob(plan.url, MEDIA_BLOB_MAX_BYTES, controller.signal);
						} catch (error) {
							expiredHttp =
								isDiscordCdnUrl(plan.url) &&
								typeof error === "object" &&
								error !== null &&
								"status" in error &&
								(error.status === 403 || error.status === 404);
						}
						controller.signal.throwIfAborted();
						if (blob === "too_large")
							await deps.warmElement(
								plan.url,
								item.type === "MEDIA" && item.media_type === "audio" ? "audio" : "video",
								controller.signal,
							);
						else {
							src = deps.createObjectURL(blob);
							entry.blob = true;
							entry.src = src;
						}
					}
					controller.signal.throwIfAborted();
					entry.src = src;
					return { status: "ready", src };
				} catch {
					return {
						status: "failed",
						reason: expiredHttp || deps.isExpired(item, deps.now()) ? "expired_url" : "load_failed",
					};
				}
			})();
			trim();
			return entry.promise;
		},
		srcFor(id: string): string | undefined {
			const entry = entries.get(id);
			if (entry) touch(id, entry);
			return entry?.src;
		},
		pin(id: string) {
			const entry = entries.get(id);
			if (entry) {
				entry.pinned = true;
				touch(id, entry);
			}
		},
		unpin(id: string) {
			const entry = entries.get(id);
			if (entry) entry.pinned = false;
			trim();
		},
		clear() {
			for (const [id, entry] of entries) if (!entry.pinned) dispose(id, entry);
		},
	};
}
export type MediaPreloader = ReturnType<typeof createMediaPreloader>;
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | "timeout"> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => resolve("timeout"), ms);
		promise.then(
			(value) => {
				clearTimeout(timer);
				resolve(value);
			},
			(error) => {
				clearTimeout(timer);
				reject(error);
			},
		);
	});
}
