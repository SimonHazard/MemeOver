import { expect, test } from "bun:test";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

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
		expect([...a[key].matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()).toEqual(
			[...b[key].matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort(),
		);
	}
});
