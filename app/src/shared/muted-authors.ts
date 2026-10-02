import type { MutedAuthor } from "./types";
// Coupled to the anonymous sentinel in bot/src/commands/subcommands/secret.ts.
export const ANONYMOUS_AUTHOR_ID = "secret";
export function mutedIdSet(list: MutedAuthor[]): ReadonlySet<string> {
	return new Set(list.map((a) => a.id));
}
export function muteDropReason(
	event: { author_id?: string; user_id?: string; anonymous?: boolean },
	muted: ReadonlySet<string>,
	hideAnonymous: boolean,
): "author_muted" | "anonymous_hidden" | null {
	const id = event.author_id ?? event.user_id;
	if (event.anonymous || id === ANONYMOUS_AUTHOR_ID)
		return hideAnonymous ? "anonymous_hidden" : null;
	return id && muted.has(id) ? "author_muted" : null;
}
export function normalizeMutedAuthors(value: unknown): MutedAuthor[] {
	if (!Array.isArray(value)) return [];
	const authors = new Map<string, MutedAuthor>();
	for (const entry of value) {
		if (
			!entry ||
			typeof entry !== "object" ||
			typeof entry.id !== "string" ||
			!entry.id ||
			entry.id === ANONYMOUS_AUTHOR_ID
		)
			continue;
		const author = {
			id: entry.id,
			username: typeof entry.username === "string" ? entry.username : "",
			avatarUrl: typeof entry.avatarUrl === "string" ? entry.avatarUrl : "",
			mutedAt:
				typeof entry.mutedAt === "number" && Number.isFinite(entry.mutedAt) ? entry.mutedAt : 0,
		};
		if (!authors.has(author.id) || (authors.get(author.id)?.mutedAt ?? 0) <= author.mutedAt)
			authors.set(author.id, author);
	}
	return [...authors.values()].sort((a, b) => b.mutedAt - a.mutedAt).slice(0, 200);
}
export function addMutedAuthor(
	list: MutedAuthor[],
	author: Omit<MutedAuthor, "mutedAt">,
	now: number,
): MutedAuthor[] {
	return normalizeMutedAuthors([
		{ ...author, mutedAt: now },
		...list.filter((a) => a.id !== author.id),
	]);
}
export function removeMutedAuthor(list: MutedAuthor[], id: string): MutedAuthor[] {
	return list.filter((a) => a.id !== id);
}
export function dropMutedFromQueue<T extends { author_id: string; anonymous?: boolean }>(
	queue: T[],
	muted: ReadonlySet<string>,
	hideAnonymous: boolean,
): T[] {
	return queue.filter((item) => muteDropReason(item, muted, hideAnonymous) === null);
}
export function canMuteAuthor(item: { author_id: string; anonymous?: boolean }): boolean {
	return Boolean(item.author_id) && !item.anonymous && item.author_id !== ANONYMOUS_AUTHOR_ID;
}
