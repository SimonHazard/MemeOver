import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkVersions } from "./check-versions";

const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "memeover-versions-"));
	roots.push(root);
	const write = (path: string, content: string) => {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), content);
	};
	const workspaces = {
		"": { name: "memeover" },
		app: { name: "@memeover/app", version: "1.8.1" },
		bot: { name: "@memeover/bot", version: "1.6.5" },
		shared: { name: "@memeover/shared", version: "1.0.1" },
		"packages/ui": { name: "@memeover/ui", version: "1.0.1" },
		site: { name: "@memeover/site", version: "1.8.1" },
	};
	write(
		"package.json",
		JSON.stringify({ name: "memeover", workspaces: Object.keys(workspaces).slice(1) }),
	);
	for (const [path, pkg] of Object.entries(workspaces).slice(1)) {
		write(`${path}/package.json`, JSON.stringify(pkg));
	}
	write("bun.lock", JSON.stringify({ workspaces }));
	write("app/src-tauri/tauri.conf.json", '{"version":"1.8.1"}');
	write("app/src-tauri/Cargo.toml", '[package]\nname = "memeover"\nversion = "1.8.1"\n');
	write("app/src-tauri/Cargo.lock", '[[package]]\nname = "memeover"\nversion = "1.8.1"\n');
	return { root, write, workspaces };
}

describe("release version consistency", () => {
	test("accepts synchronized app versions and independent bot/shared/UI versions", () => {
		expect(checkVersions(fixture().root)).toEqual([]);
	});

	test.each([
		["app/src-tauri/tauri.conf.json", '{"version":"1.8.0"}'],
		["app/src-tauri/Cargo.toml", '[package]\nversion = "1.8.0"\n'],
		["app/src-tauri/Cargo.lock", '[[package]]\nname = "memeover"\nversion = "1.8.0"\n'],
		["site/package.json", '{"name":"@memeover/site","version":"1.8.0"}'],
	])("rejects a stale app version in %s", (path, content) => {
		const { root, write } = fixture();
		write(path, content);
		expect(checkVersions(root).some((error) => error.startsWith(path))).toBe(true);
	});

	test("rejects stale workspace versions and missing entries in the Bun lockfile", () => {
		const { root, write, workspaces } = fixture();
		workspaces.bot.version = "1.6.4";
		const { shared: _shared, ...incomplete } = workspaces;
		write("bun.lock", JSON.stringify({ workspaces: incomplete }));
		const errors = checkVersions(root);
		expect(errors.some((error) => error.startsWith("bun.lock (bot)"))).toBe(true);
		expect(errors.some((error) => error.startsWith("bun.lock (shared)"))).toBe(true);
	});

	test("rejects removing a workspace version even when its lockfile entry also omits it", () => {
		const { root, write, workspaces } = fixture();
		write("bot/package.json", '{"name":"@memeover/bot"}');
		write(
			"bun.lock",
			JSON.stringify({ workspaces: { ...workspaces, bot: { name: "@memeover/bot" } } }),
		);
		expect(checkVersions(root)).toContain("bot/package.json must declare a version");
	});

	test("rejects a missing native package in Cargo.lock", () => {
		const { root, write } = fixture();
		write("app/src-tauri/Cargo.lock", '[[package]]\nname = "another-package"\nversion = "1.8.1"\n');
		expect(checkVersions(root).some((error) => error.startsWith("app/src-tauri/Cargo.lock"))).toBe(
			true,
		);
	});
});
