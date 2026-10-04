export type EnqueueDropReason = "queue_full" | "author_limit";
export function canEnqueue(
	queue: ReadonlyArray<{ author_id: string }>,
	item: { author_id: string; anonymous?: boolean },
	opts: { maxQueue: number; maxPerAuthor: number; isReplay?: boolean },
): EnqueueDropReason | null {
	if (queue.length >= opts.maxQueue) return "queue_full";
	// Anonymous memes share one sentinel author_id across every sender: capping them
	// per author would throttle unrelated people together. Only the global cap applies.
	if (
		!opts.isReplay &&
		!item.anonymous &&
		opts.maxPerAuthor > 0 &&
		queue.filter((q) => q.author_id === item.author_id).length >= opts.maxPerAuthor
	)
		return "author_limit";
	return null;
}
