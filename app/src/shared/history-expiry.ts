import { isCdnUrlExpired, isDiscordCdnUrl } from "@memeover/shared";
import { isLocalTestItem } from "./local-test";
import type { DisplayQueueItem } from "./types";
export function isMediaExpired(item: DisplayQueueItem, now: number): boolean {
	return (
		item.type === "MEDIA" && isDiscordCdnUrl(item.media_url) && isCdnUrlExpired(item.media_url, now)
	);
}
export function purgeExpired<T extends DisplayQueueItem>(
	items: T[],
	now: number,
): { kept: T[]; removed: number } {
	const kept = items.filter((item) => !isMediaExpired(item, now));
	return { kept, removed: items.length - kept.length };
}
export function toReplayItem(
	item: DisplayQueueItem & { recordedAt?: number },
	newQueueId: string,
): DisplayQueueItem {
	const { recordedAt: _recordedAt, ...display } = item;
	return { ...display, queueId: newQueueId, replayOf: item.queueId };
}
export function shouldLogToHistory(item: DisplayQueueItem): boolean {
	return !item.replayOf && !isLocalTestItem(item);
}
