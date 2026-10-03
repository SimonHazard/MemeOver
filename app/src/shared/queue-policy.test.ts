import { expect, test } from "bun:test";
import { canEnqueue } from "./queue-policy";

const opts = { maxQueue: 50, maxPerAuthor: 3 };
for (const count of [0, 2, 3, 4])
	test(`author count ${count}`, () =>
		expect(
			canEnqueue(
				Array.from({ length: count }, () => ({ author_id: "a" })),
				{ author_id: "a" },
				opts,
			),
		).toBe(count >= 3 ? "author_limit" : null));
test("zero author limit is unlimited", () =>
	expect(
		canEnqueue(
			Array.from({ length: 10 }, () => ({ author_id: "a" })),
			{ author_id: "a" },
			{ ...opts, maxPerAuthor: 0 },
		),
	).toBeNull());
test("replay bypasses author limit", () =>
	expect(
		canEnqueue(
			Array.from({ length: 5 }, () => ({ author_id: "a" })),
			{ author_id: "a" },
			{ ...opts, isReplay: true },
		),
	).toBeNull());
test("replay cannot bypass global limit", () =>
	expect(
		canEnqueue(
			Array.from({ length: 50 }, () => ({ author_id: "a" })),
			{ author_id: "b" },
			{ ...opts, isReplay: true },
		),
	).toBe("queue_full"));
test("different authors independent", () =>
	expect(
		canEnqueue(
			Array.from({ length: 4 }, () => ({ author_id: "a" })),
			{ author_id: "b" },
			opts,
		),
	).toBeNull());
test("anonymous shares secret bucket", () =>
	expect(
		canEnqueue(
			Array.from({ length: 3 }, () => ({ author_id: "secret" })),
			{ author_id: "secret" },
			opts,
		),
	).toBe("author_limit"));
