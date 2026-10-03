import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import i18n from "../../i18n";
import type { HistoryItem } from "../../shared/history";
import type { MediaQueueItem } from "../../shared/types";
import { HistoryItemCard } from "./components/history-item";

// Isolate navigation/native APIs; keep the real settings root and Radix components.
mock.module("../../routeTree.gen", () => ({ routeTree: {} }));
let currentItem: HistoryItem;
mock.module("@tanstack/react-router", () => ({
	createMemoryHistory: () => ({}),
	createRouter: () => ({}),
	RouterProvider: () => (
		<HistoryItemCard item={currentItem} onReplay={() => {}} onMuteAuthor={() => {}} />
	),
}));
const { SettingsApp } = await import("./SettingsApp");

const author = {
	guild_id: "guild-test",
	channel_id: "channel-test",
	message_id: "message-test",
	timestamp: 1000,
	author_id: "123",
	author_username: "Test author",
	author_avatar_url: "",
	queueId: "test-history",
	recordedAt: 1000,
};
const media: MediaQueueItem & { recordedAt: number } = {
	...author,
	type: "MEDIA",
	media_type: "image",
	media_url: "https://example.com/test.png",
};

describe("settings history renders with real tooltip context", () => {
	for (const [name, item] of [
		["fresh media", media],
		["expired Discord media", { ...media, media_url: "https://cdn.discordapp.com/a?ex=1" }],
		["text", { ...author, type: "TEXT", text: "Test text" }],
		["anonymous media", { ...media, author_id: "secret", anonymous: true }],
	] as const) {
		test(name, () => {
			currentItem = item;
			const html = renderToStaticMarkup(<SettingsApp />);
			expect(html).toContain(i18n.t("history.replay"));
			if (name === "expired Discord media") {
				expect(html).toContain(i18n.t("history.expired"));
				expect(html).toContain('disabled=""');
			}
			if (name === "anonymous media") {
				expect(html).not.toContain(i18n.t("history.muteAuthor"));
			} else {
				expect(html).toContain(i18n.t("history.muteAuthor"));
			}
		});
	}
});
