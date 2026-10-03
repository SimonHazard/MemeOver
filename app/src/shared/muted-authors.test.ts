import { expect, test } from "bun:test";
import {
	addMutedAuthor,
	canMuteAuthor,
	dropMutedFromQueue,
	muteDropReason,
	mutedIdSet,
	normalizeMutedAuthors,
	removeMutedAuthor,
} from "./muted-authors";

const author = { id: "a", username: "A", avatarUrl: "" };
const list = [{ ...author, mutedAt: 1 }];
test("mute set and MEDIA/TEXT/REACTION reasons", () => {
	const set = mutedIdSet(list);
	expect(muteDropReason({ author_id: "a" }, set, false)).toBe("author_muted");
	expect(muteDropReason({ user_id: "a" }, set, false)).toBe("author_muted");
	expect(muteDropReason({ author_id: "b" }, set, false)).toBeNull();
});
test("anonymous never matched by identity", () => {
	expect(muteDropReason({ author_id: "a", anonymous: true }, mutedIdSet(list), false)).toBeNull();
	expect(muteDropReason({ author_id: "secret" }, new Set(["secret"]), false)).toBeNull();
	expect(muteDropReason({ author_id: "secret" }, new Set(), true)).toBe("anonymous_hidden");
});
test("add idempotently updates time", () => {
	expect(addMutedAuthor(list, author, 10)).toEqual([{ ...author, mutedAt: 10 }]);
	expect(removeMutedAuthor(list, "a")).toEqual([]);
});
test("most recent two hundred retained", () => {
	const entries = Array.from({ length: 201 }, (_, i) => ({ ...author, id: String(i), mutedAt: i }));
	const result = normalizeMutedAuthors(entries);
	expect(result).toHaveLength(200);
	expect(result[0].id).toBe("200");
	expect(result.some((a) => a.id === "0")).toBe(false);
});
test("sanitization and deduplication", () => {
	expect(
		normalizeMutedAuthors([
			null,
			{},
			{ id: "" },
			{ id: "a", username: 5, mutedAt: NaN },
			{ id: "a", username: "A", avatarUrl: "x", mutedAt: 5 },
		]),
	).toEqual([{ id: "a", username: "A", avatarUrl: "x", mutedAt: 5 }]);
});
test("queue drops muted authors and optional anonymous", () => {
	const queue = [{ author_id: "a" }, { author_id: "b" }, { author_id: "secret", anonymous: true }];
	expect(dropMutedFromQueue(queue, mutedIdSet(list), false)).toEqual(queue.slice(1));
	expect(dropMutedFromQueue(queue, mutedIdSet(list), true)).toEqual([queue[1]]);
});
test("anonymous identity cannot be individually muted", () => {
	expect(canMuteAuthor({ author_id: "secret" })).toBe(false);
	expect(canMuteAuthor({ author_id: "a", anonymous: true })).toBe(false);
	expect(canMuteAuthor({ author_id: "a" })).toBe(true);
});
