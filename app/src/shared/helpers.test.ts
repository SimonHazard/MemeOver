import { expect, test } from "bun:test";
import {
	emojiUrl,
	enabledTypesToList,
	listToEnabledTypes,
	overlayHealthVariant,
	parseInlineEmojis,
	sameMonitorPosition,
	statusVariant,
} from "./helpers";

for (const [status, value] of [
	["connected", "default"],
	["connecting", "secondary"],
	["error", "destructive"],
	["disconnected", "outline"],
] as const)
	test(`status ${status}`, () => expect(statusVariant(status)).toBe(value));
test("health variants", () => {
	expect(overlayHealthVariant("alive")).toBe("default");
	expect(overlayHealthVariant("closed")).toBe("outline");
});
test("monitor match depends only on coordinates", () => {
	expect(sameMonitorPosition({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
	expect(sameMonitorPosition({ x: 1, y: 2 }, { x: 1, y: 3 })).toBe(false);
});
test("emoji transport extensions", () => {
	// characterization: inline static emojis use webp; bot reactions use png.
	expect(emojiUrl("123", true)).toBe("https://cdn.discordapp.com/emojis/123.gif");
	expect(emojiUrl("123", false)).toBe("https://cdn.discordapp.com/emojis/123.webp");
});
test("plain inline text", () =>
	expect(parseInlineEmojis("hello")).toEqual([{ kind: "text", value: "hello", offset: 0 }]));
test("inline animated emoji offsets", () =>
	expect(parseInlineEmojis("hi <a:dance:123>!")).toEqual([
		{ kind: "text", value: "hi ", offset: 0 },
		{ kind: "emoji", id: "123", name: "dance", animated: true, offset: 3 },
		{ kind: "text", value: "!", offset: 16 },
	]));
test("adjacent and boundary emojis", () =>
	expect(parseInlineEmojis("<:x:1><:y:2>")).toEqual([
		{ kind: "emoji", id: "1", name: "x", animated: false, offset: 0 },
		{ kind: "emoji", id: "2", name: "y", animated: false, offset: 6 },
	]));
test("empty inline string", () => expect(parseInlineEmojis("")).toEqual([]));
test("type list roundtrip ignores unknown names", () => {
	const types = listToEnabledTypes(["image", "text", "alien"]);
	expect(enabledTypesToList(types)).toEqual(["image", "text"]);
	expect(listToEnabledTypes(enabledTypesToList(types))).toEqual(types);
});
