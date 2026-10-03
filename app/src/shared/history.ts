import { emit } from "@tauri-apps/api/event";
import { Store } from "@tauri-apps/plugin-store";
import { purgeExpired } from "./history-expiry";
import { loadSettings } from "./settings";
import type { DisplayQueueItem } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A DisplayQueueItem that was shown on the overlay, plus a wall-clock timestamp. */
export type HistoryItem = DisplayQueueItem & { recordedAt: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_HISTORY = 50;

// ─── Store helpers ────────────────────────────────────────────────────────────

async function getStore(): Promise<Store> {
	return Store.load("history.json");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Load all history items from disk (newest first). Proactively trims to MAX_HISTORY. */
export async function loadHistory(): Promise<HistoryItem[]> {
	const store = await getStore();
	const items = (await store.get<HistoryItem[]>("history")) ?? [];
	if (items.length > MAX_HISTORY) {
		const trimmed = items.slice(0, MAX_HISTORY);
		await store.set("history", trimmed);
		await store.save();
		return trimmed;
	}
	return items;
}

/**
 * Prepend a displayed item to the history store.
 * Automatically trims to MAX_HISTORY items.
 * Called fire-and-forget from the overlay window.
 */
export async function addToHistory(item: DisplayQueueItem): Promise<void> {
	const store = await getStore();
	const current = (await store.get<HistoryItem[]>("history")) ?? [];
	const historyItem: HistoryItem = { ...item, recordedAt: Date.now() };
	const updated = [historyItem, ...current].slice(0, MAX_HISTORY);
	await store.set("history", updated);
	await store.save();
	await emit("history-updated");
}

/** Remove all history items from disk. */
export async function clearHistory(): Promise<void> {
	const store = await getStore();
	await store.set("history", []);
	await store.save();
	await emit("history-updated");
}

/**
 * Emit a "replay-item" event so the overlay window re-enqueues the item.
 * Called from the settings window's history page; the overlay regenerates queueId.
 */
export async function replayHistoryItem(item: DisplayQueueItem): Promise<void> {
	await emit("replay-item", item);
}

export async function purgeExpiredHistory(now = Date.now()): Promise<number> {
	const store = await getStore();
	const items = (await store.get<HistoryItem[]>("history")) ?? [];
	const { kept, removed } = purgeExpired(items, now);
	if (removed > 0) {
		await store.set("history", kept);
		await store.save();
		await emit("history-updated");
	}
	return removed;
}
let autoPurgeTimer: ReturnType<typeof setInterval> | undefined;
export function startHistoryAutoPurge(): void {
	if (autoPurgeTimer !== undefined) return;
	const purge = async () => {
		try {
			if ((await loadSettings()).historyAutoPurge) await purgeExpiredHistory();
		} catch (error) {
			console.warn("[History] Could not purge expired media", error);
		}
	};
	void purge();
	autoPurgeTimer = setInterval(() => void purge(), 60 * 60 * 1000);
}
