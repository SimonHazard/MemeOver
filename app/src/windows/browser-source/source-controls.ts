import {
	decodeSourceControls,
	SOURCE_COMMAND_LOG_LIMIT,
	type SourceControls,
} from "@/shared/browser-source";
import { useAppStore } from "@/shared/store";
import type { DisplayQueueItem } from "@/shared/types";

// Applies what the desktop app publishes on each liveness check: the streamer's skip, clear
// and moderation actions reach a loaded page without copying the link again.

export interface ControlActions {
	commands: string;
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
	let commands = "";
	if (previous && next.skip >= previous.skip && next.clear >= previous.clear) {
		const skipped = next.skip - previous.skip;
		const cleared = next.clear - previous.clear;
		const count = skipped + cleared;
		if (count > SOURCE_COMMAND_LOG_LIMIT) {
			// A suspended page missed the retained history: discard stale content rather
			// than guessing which commands were lost. Never carry skips into future memes.
			commands = "cs";
		} else if (count > 0) {
			commands =
				next.commandLog?.slice(-count) ?? `${cleared > 0 ? "c" : ""}${"s".repeat(skipped)}`;
		}
	}
	return {
		commands,
		moderation: previous === null || moderationKey(next) !== moderationKey(previous),
	};
}

/**
 * React batches store updates: bumping skip twice would still hide only one player.
 * Advance the waiting items here, in command order, then animate the visible item out once.
 * A clear preserves the item a preceding skip would have admitted as the new current item.
 */
function applyCommands(commands: string): void {
	if (!commands) return;
	useAppStore.setState((state) => {
		let originalPresent = state.isDisplaying;
		let promoted: DisplayQueueItem | undefined;
		let queue = state.queue;
		let skipCurrent = false;
		for (const command of commands) {
			if (command === "c") {
				queue = [];
				continue;
			}
			if (originalPresent) {
				originalPresent = false;
				skipCurrent = true;
			} else if (!promoted) {
				if (queue.length === 0) continue;
				queue = queue.slice(1);
			}
			promoted = queue[0];
			queue = queue.slice(1);
		}
		return {
			queue: promoted ? [promoted, ...queue] : queue,
			skipVersion: state.skipVersion + (skipCurrent ? 1 : 0),
		};
	});
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
	applyCommands(actions.commands);
	return next;
}
