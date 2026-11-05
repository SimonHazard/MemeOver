import { decodeSourceControls, type SourceControls } from "@/shared/browser-source";
import { useAppStore } from "@/shared/store";

// Applies what the desktop app publishes on each liveness check: the streamer's skip, clear
// and moderation actions reach a loaded page without copying the link again.

export interface ControlActions {
	skip: boolean;
	clear: boolean;
	moderation: boolean;
}

function moderationKey({ mutedAuthors, hideAnonymous }: SourceControls): string {
	return JSON.stringify([mutedAuthors.map((author) => author.id), hideAnonymous]);
}

/**
 * The first value only sets the baseline: actions taken before this page loaded are over, while
 * the current moderation state is authoritative over the possibly older copy in the link.
 */
export function controlActions(
	previous: SourceControls | null,
	next: SourceControls,
): ControlActions {
	if (!previous) return { skip: false, clear: false, moderation: true };
	return {
		skip: next.skip !== previous.skip,
		clear: next.clear !== previous.clear,
		moderation: moderationKey(next) !== moderationKey(previous),
	};
}

/** Returns the new baseline; a server sending no readable value changes nothing. */
export function applySourceControls(
	previous: SourceControls | null,
	header: string | null,
): SourceControls | null {
	const next = decodeSourceControls(header);
	if (!next) return previous;
	const actions = controlActions(previous, next);
	const store = useAppStore.getState();
	// `updateSettings` also drops the author's queued items and skips the one on screen.
	if (actions.moderation) {
		store.updateSettings({ mutedAuthors: next.mutedAuthors, hideAnonymous: next.hideAnonymous });
	}
	if (actions.clear) store.clearQueue();
	if (actions.skip) store.bumpSkip();
	return next;
}
