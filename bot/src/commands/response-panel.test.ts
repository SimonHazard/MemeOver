import { expect, test } from "bun:test";
import { MessageFlags, SeparatorSpacingSize } from "discord.js";
import pkg from "../../package.json";
import { componentsToJson, panelResponse, publicPanelMessage } from "./response-panel";

const base = { tone: "info", title: "T" } as const;
test("panels default to ephemeral Components V2 without mentions", () => {
	const panel = panelResponse(base);
	expect(Number(panel.flags)).toBe(MessageFlags.Ephemeral | MessageFlags.IsComponentsV2);
	expect(panel.allowedMentions).toEqual({ parse: [] });
});
test("explicit public panel", () =>
	expect(Number(panelResponse({ ...base, ephemeral: false }).flags)).toBe(
		MessageFlags.IsComponentsV2,
	));
test("suppressed notifications", () =>
	expect(Number(panelResponse({ ...base, suppressNotifications: true }).flags)).toBe(
		MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral | MessageFlags.SuppressNotifications,
	));
test("public message always removes ephemeral", () =>
	expect(Number(publicPanelMessage({ ...base, ephemeral: true }).flags)).toBe(
		MessageFlags.IsComponentsV2,
	));
test("footer follows independently versioned bot package", () => {
	const json = componentsToJson(panelResponse(base)) as { components: { content?: string }[] }[];
	expect(json[0].components[json[0].components.length - 1]?.content).toBe(
		`-# MemeOver v${pkg.version}`,
	);
});
test("large field separator precedes field", () => {
	const json = componentsToJson(
		panelResponse({ ...base, fields: [{ name: "N", value: "V" }] }),
	) as { components: { spacing?: number; divider?: boolean; content?: string }[] }[];
	expect(json[0].components[1]).toMatchObject({
		spacing: SeparatorSpacingSize.Large,
		divider: true,
	});
	expect(json[0].components[2].content).toBe("**N**\nV");
});
