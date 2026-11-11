import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";

const root = join(import.meta.dir, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

/** Entries of one named filter in a workflow's paths-filter block. */
function filterEntries(workflow: string, name: string): string[] {
	const lines = read(workflow).split("\n");
	const start = lines.findIndex((line) => line.trim() === `${name}:`);
	if (start < 0) throw new Error(`Missing ${workflow} filter ${name}`);
	const entries: string[] = [];
	for (const line of lines.slice(start + 1)) {
		const entry = line.trim().match(/^- '(.+)'$/);
		if (!entry) break;
		entries.push(entry[1]);
	}
	return entries;
}

test("the rust filter watches every file its tests embed", () => {
	const rustDir = "app/src-tauri/src";
	const embedded = readdirSync(join(root, rustDir))
		.filter((file) => file.endsWith(".rs"))
		.flatMap((file) =>
			[...read(join(rustDir, file)).matchAll(/include_str!\("([^"]+)"\)/g)].map((match) =>
				normalize(join(rustDir, match[1])),
			),
		)
		.filter((path) => !path.startsWith("app/src-tauri/"));
	expect(embedded.length).toBeGreaterThan(0);
	const watched = filterEntries(".github/workflows/ci.yml", "rust");
	for (const path of embedded) expect(watched).toContain(path);
});

test("the site rebuilds when the files it imports from outside site/ change", () => {
	const ciSite = filterEntries(".github/workflows/ci.yml", "site");
	const deployPath = ".github/workflows/site-deploy.yml";
	const deploy = read(deployPath);
	const deploySite = filterEntries(deployPath, "site");
	for (const path of ["CHANGELOG.md", "app/package.json"]) {
		expect(ciSite).toContain(path);
		expect(deploy.split(`- "${path}"`).length - 1).toBe(2);
		expect(deploySite).toContain(path);
	}
});
