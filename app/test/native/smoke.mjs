import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	cleanupWdioSession,
	createTauriCapabilities,
	startWdioSession,
} from "@wdio/tauri-service";

const appDir = fileURLToPath(new URL("../../", import.meta.url));
const targetDir = join(appDir, "src-tauri", "target", "native-e2e");
execFileSync("bun", [
	"run", "tauri", "build", "--debug", "--no-bundle",
	"--features", "native-e2e", "--config", "test/native/tauri.conf.json",
], {
	cwd: appDir,
	env: { ...process.env, CARGO_TARGET_DIR: targetDir },
	stdio: "inherit",
});

const executable = process.platform === "win32" ? "memeover.exe" : "memeover";
const binary = join(targetDir, "debug", executable);
const capabilities = createTauriCapabilities(binary, { driverProvider: "embedded" });
const browser = await startWdioSession(capabilities);
try {
	const handles = await browser.getWindowHandles();
	assert.ok(handles.includes("overlay"), "Tauri created the overlay window");
	await browser.switchToWindow("settings");
	await browser.$('main nav button[aria-current="page"]').waitForDisplayed();
	console.log("Native settings navigation is visible and the overlay window exists.");
} finally {
	await cleanupWdioSession(browser);
}
