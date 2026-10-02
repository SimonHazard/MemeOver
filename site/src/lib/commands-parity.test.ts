import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { en } from "../i18n/en";
import { fr } from "../i18n/fr";

test("command catalog matches README names in both locales", () => {
	const readme = readFileSync(new URL("../../../README.md", import.meta.url), "utf8");
	const names = [
		...new Set([...readme.matchAll(/\| `\/memeover (\w+)/g)].map((m) => `/memeover ${m[1]}`)),
	].sort();
	expect(en.commands.items.map((c) => c.name).sort()).toEqual(names);
	expect(fr.commands.items.map((c) => c.name).sort()).toEqual(names);
	// Keep newly implemented commands out of public copy until release acceptance.
	expect(en.commands.items.filter((c) => !c.published).map((c) => c.name)).toEqual([]);
});
