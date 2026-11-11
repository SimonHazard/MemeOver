import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "app", "src-tauri");
const read = (path: string) => readFileSync(join(root, path), "utf8");

function handlerCommands(): string[] {
	const handler = read("src/lib.rs").match(/tauri::generate_handler!\[([\s\S]*?)\]/);
	if (!handler) throw new Error("Missing Tauri command handler");
	return handler[1]
		.split(",")
		.map((command) => command.trim().split("::").at(-1) ?? "")
		.filter(Boolean);
}

function manifestCommands(): string[] {
	const commands = read("build.rs").match(/const COMMANDS:[\s\S]*?=\s*&\[([\s\S]*?)\]/);
	if (!commands) throw new Error("Missing Tauri app manifest commands");
	return [...commands[1].matchAll(/"([a-z_]+)"/g)].map((match) => match[1]);
}

interface Capability {
	windows: string[];
	permissions: string[];
}

const overlay = JSON.parse(read("capabilities/overlay.json")) as Capability;
const settings = JSON.parse(read("capabilities/settings.json")) as Capability;
const permissionFor = (command: string) => `allow-${command.replaceAll("_", "-")}`;

test("the app manifest declares exactly the registered Tauri commands", () => {
	expect(manifestCommands().sort()).toEqual(handlerCommands().sort());
});

test("each Tauri app command has a window capability grant", () => {
	const grants = new Set([...overlay.permissions, ...settings.permissions]);
	for (const command of handlerCommands()) expect(grants.has(permissionFor(command))).toBe(true);
});

test("only the two overlay app commands are granted to the overlay window", () => {
	expect(overlay.windows).toEqual(["overlay"]);
	expect(settings.windows).toEqual(["settings"]);
	expect(
		overlay.permissions.filter((permission) => permission.startsWith("allow-")).sort(),
	).toEqual(["allow-set-overlay-click-through", "allow-move-overlay-to-monitor"].sort());
});
