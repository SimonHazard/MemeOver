import { isMediaExpired } from "@/shared/history-expiry";
import { createMediaPreloader, type PreloaderDeps } from "./media-preloader";

const abortError = () => new DOMException("Preload aborted", "AbortError");
export const browserLoaders: PreloaderDeps = {
	async loadImage(url, signal) {
		signal.throwIfAborted();
		const img = new Image();
		img.decoding = "async";
		await new Promise<void>((resolve, reject) => {
			const abort = () => {
				img.removeAttribute("src");
				reject(abortError());
			};
			signal.addEventListener("abort", abort, { once: true });
			img.src = url;
			void img
				.decode()
				.then(resolve, reject)
				.finally(() => signal.removeEventListener("abort", abort));
		});
	},
	async fetchBlob(url, maxBytes, signal) {
		const response = await fetch(url, { signal, credentials: "omit" });
		if (!response.ok) {
			await response.body?.cancel();
			throw Object.assign(new Error("Media fetch failed"), { status: response.status });
		}
		if (Number(response.headers.get("content-length")) > maxBytes) {
			await response.body?.cancel();
			return "too_large";
		}
		const reader = response.body?.getReader();
		if (!reader) return new Blob();
		const chunks: Uint8Array<ArrayBuffer>[] = [];
		let size = 0;
		try {
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				size += value.byteLength;
				if (size > maxBytes) {
					await reader.cancel();
					return "too_large";
				}
				chunks.push(value);
			}
		} finally {
			reader.releaseLock();
		}
		return new Blob(chunks, { type: response.headers.get("content-type") ?? "" });
	},
	warmElement(url, kind, signal) {
		signal.throwIfAborted();
		return new Promise<void>((resolve, reject) => {
			const element = document.createElement(kind);
			element.preload = "auto";
			element.muted = true;
			const cleanup = () => {
				element.removeEventListener("loadeddata", ready);
				element.removeEventListener("error", failed);
				signal.removeEventListener("abort", abort);
				element.removeAttribute("src");
				element.load();
			};
			const ready = () => {
					cleanup();
					resolve();
				},
				failed = () => {
					cleanup();
					reject(new Error("Media warm-up failed"));
				},
				abort = () => {
					cleanup();
					reject(abortError());
				};
			element.addEventListener("loadeddata", ready, { once: true });
			element.addEventListener("error", failed, { once: true });
			signal.addEventListener("abort", abort, { once: true });
			element.src = url;
			element.load();
		});
	},
	createObjectURL: (blob) => URL.createObjectURL(blob),
	revokeObjectURL: (url) => URL.revokeObjectURL(url),
	isExpired: isMediaExpired,
	now: Date.now,
};
export const mediaPreloader = createMediaPreloader(browserLoaders);
