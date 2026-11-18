import type { TwitchPurgeAction } from "./route-twitch-event";

interface TwitchPurgeItem {
	origin?: "twitch";
	message_id: string;
	author_id: string;
}
export function isPurged<T extends TwitchPurgeItem>(
	current: T | null,
	action: TwitchPurgeAction,
): boolean {
	if (current?.origin !== "twitch") return false;
	if (action.kind === "purge_all") return true;
	if (action.kind === "purge_message") return current.message_id === action.messageId;
	return current.author_id === action.authorId;
}
export function purgeTwitchQueue<T extends TwitchPurgeItem>(
	queue: T[],
	action: TwitchPurgeAction,
): T[] {
	return queue.filter((item) => !isPurged(item, action));
}
