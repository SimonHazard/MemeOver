import { appendFileSync, readFileSync } from "node:fs";

type Lockfile = { workspaces?: Record<string, { version?: string }> };

/** Canonical lockfile content without the workspace versions a release bump rewrites. */
export function lockfileDependencies(text: string): string {
	const lock = Bun.JSON5.parse(text) as Lockfile;
	for (const workspace of Object.values(lock.workspaces ?? {})) delete workspace.version;
	return JSON.stringify(lock);
}

/** A missing base lockfile counts as a change so callers fail towards running everything. */
export function dependenciesChanged(base: string | null, head: string): boolean {
	return base === null || lockfileDependencies(base) !== lockfileDependencies(head);
}

if (import.meta.main) {
	const baseSha = process.env.BASE_SHA ?? "";
	const base = baseSha ? Bun.spawnSync(["git", "show", `${baseSha}:bun.lock`]) : null;
	const changed = dependenciesChanged(
		base?.exitCode === 0 ? base.stdout.toString() : null,
		readFileSync("bun.lock", "utf8"),
	);
	console.log(`bun.lock dependencies changed: ${changed}`);
	if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
}
