import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const workflows = join(import.meta.dir, "..", ".github", "workflows");

test("third-party actions are pinned to a full commit SHA with a version comment", () => {
	const unpinned: string[] = [];
	for (const file of readdirSync(workflows).filter((name) => name.endsWith(".yml"))) {
		const lines = readFileSync(join(workflows, file), "utf8").split("\n");
		lines.forEach((line, index) => {
			const use = line.match(/uses:\s*(\S+)(.*)$/);
			if (!use || use[1].startsWith("actions/") || use[1].startsWith("./")) return;
			const pinned = /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/.test(use[1]) && /#\s*\S+/.test(use[2]);
			if (!pinned) unpinned.push(`${file}:${index + 1} ${use[1]}`);
		});
	}
	expect(unpinned).toEqual([]);
});
