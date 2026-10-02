import { expect, test } from "bun:test";
import { en } from "./en";
import { fr } from "./fr";
import { getAlternateLocalePath, getLangFromUrl, getLocalizedPath, t } from "./index";

function leaves(value: unknown, prefix = ""): Record<string, string> {
	if (typeof value === "string") return { [prefix]: value };
	const result: Record<string, string> = {};
	for (const [key, child] of Object.entries(value as Record<string, unknown>))
		Object.assign(result, leaves(child, `${prefix}.${key}`));
	return result;
}
test("translation keys, non-empty strings and placeholders match", () => {
	const a = leaves(en),
		b = leaves(fr);
	expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
	for (const key of Object.keys(a)) {
		expect(a[key].trim().length).toBeGreaterThan(0);
		expect(b[key].trim().length).toBeGreaterThan(0);
		expect([...a[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()).toEqual(
			[...b[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(),
		);
	}
});

test("URL language", () => {
	expect(getLangFromUrl(new URL("https://x/fr/legal"))).toBe("fr");
	expect(getLangFromUrl(new URL("https://x/legal"))).toBe("en");
});
test("localized path", () => {
	expect(getLocalizedPath("en", "/legal")).toBe("/legal");
	expect(getLocalizedPath("fr", "/legal")).toBe("/fr/legal");
});
for (const [path, other] of [
	["/", "/fr/"],
	["/fr/", "/"],
	["/legal", "/fr/legal"],
	["/fr/legal", "/legal"],
	["/legal/", "/fr/legal"],
	["/foo", "/fr/foo"],
])
	test(`alternate ${path}`, () => expect(getAlternateLocalePath(path)).toBe(other));
test("unknown locale falls back to English", () =>
	expect(t("de", "nav.download")).toBe(en.nav.download));
