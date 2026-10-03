export type EnqueueDropReason = "queue_full" | "author_limit";
export function canEnqueue(
	queue: ReadonlyArray<{ author_id: string }>,
	item: { author_id: string },
	opts: { maxQueue: number; maxPerAuthor: number; isReplay?: boolean },
): EnqueueDropReason | null {
	if (queue.length >= opts.maxQueue) return "queue_full";
	if (
		!opts.isReplay &&
		opts.maxPerAuthor > 0 &&
		queue.filter((q) => q.author_id === item.author_id).length >= opts.maxPerAuthor
	)
		return "author_limit";
	return null;
}
