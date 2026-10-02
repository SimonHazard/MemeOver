import type { DisplayQueueItem, Settings } from "@/shared/types";
export const MEDIA_SAFETY_DELAY_MS = 2_000;
export const EXIT_RECOVERY_MS = 1_000;
export function shouldArmDisplayTimer(
	item: DisplayQueueItem | null,
	syncMediaDuration: boolean,
): boolean {
	return !(
		syncMediaDuration &&
		item?.type === "MEDIA" &&
		(item.media_type === "video" || item.media_type === "audio")
	);
}
export function displayDurationMs(settings: Pick<Settings, "duration">): number {
	return settings.duration * 1_000;
}
export function safetyDelayMs(item: DisplayQueueItem): number {
	return item.type === "TEXT" ? 0 : MEDIA_SAFETY_DELAY_MS;
}
export function isSkipRequest(skipVersion: number): boolean {
	return skipVersion !== 0;
}
export function shouldDequeue(current: DisplayQueueItem | null, queueLength: number): boolean {
	return current === null && queueLength > 0;
}
