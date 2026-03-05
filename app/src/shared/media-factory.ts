import type { MediaEvent, TextEvent } from "@memeover/shared";
import type { MediaQueueItem, TextQueueItem } from "./types";

// ─── Factory functions ─────────────────────────────────────────────────────────

/** Wraps a raw MediaEvent with a stable React key. */
export function mediaEventToQueueItem(e: MediaEvent): MediaQueueItem {
	return { ...e, queueId: crypto.randomUUID() };
}

/** Wraps a raw TextEvent with a stable React key. */
export function textEventToQueueItem(e: TextEvent): TextQueueItem {
	return { ...e, queueId: crypto.randomUUID() };
}
