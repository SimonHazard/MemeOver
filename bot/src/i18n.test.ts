import { expect, test } from "bun:test";
import { resolveBotLocale, t, translations } from "./i18n";

for (const [locale, expected] of [
	["fr", "fr"],
	["fr-FR", "fr"],
	["FR", "fr"],
	["en-US", "en"],
	["de", "en"],
	[null, "en"],
	[undefined, "en"],
] as const)
	test(`locale ${locale}`, () => expect(resolveBotLocale(locale)).toBe(expected));
test("bot translation parity and localized values", () => {
	expect(Object.keys(translations.en).sort()).toEqual(Object.keys(translations.fr).sort());
	for (const key of Object.keys(translations.en) as (keyof typeof translations.en)[]) {
		expect(t("fr", key)).toBe(translations.fr[key]);
		expect([...translations.en[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()).toEqual(
			[...translations.fr[key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(),
		);
	}
});
