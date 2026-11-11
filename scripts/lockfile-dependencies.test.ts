import { describe, expect, test } from "bun:test";
import { dependenciesChanged } from "./lockfile-dependencies";

const lockfile = (botVersion: string, elysia: string) => `{
  "lockfileVersion": 1,
  "workspaces": {
    "": { "name": "memeover" },
    "bot": {
      "name": "@memeover/bot",
      "version": "${botVersion}",
      "dependencies": { "elysia": "${elysia}", },
    },
  },
  "packages": {
    "elysia": ["elysia@${elysia}", "", {}, "sha512-x"],
  },
}`;

describe("dependenciesChanged", () => {
	test("ignores a workspace version bump", () => {
		expect(dependenciesChanged(lockfile("1.6.13", "1.4.0"), lockfile("1.6.14", "1.4.0"))).toBe(
			false,
		);
	});

	test("detects a dependency update alongside a version bump", () => {
		expect(dependenciesChanged(lockfile("1.6.13", "1.4.0"), lockfile("1.6.14", "1.4.1"))).toBe(
			true,
		);
	});

	test("treats a missing base lockfile as a change", () => {
		expect(dependenciesChanged(null, lockfile("1.6.14", "1.4.0"))).toBe(true);
	});
});
