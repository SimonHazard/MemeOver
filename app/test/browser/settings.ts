import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import appPackage from "../../package.json";
import { DEFAULT_SETTINGS } from "../../src/shared/types";

// Isolated browser storage only. No native files, Discord or server processes are touched.
const onboarding = new URLSearchParams(location.search).has("onboarding");
if (!onboarding) localStorage.setItem("onboarding-done", "1");
localStorage.setItem("lang", "en");
const paths = new Map<number, string>();
const monitor = {
	name: "Test display",
	size: { width: 1920, height: 1080 },
	position: { x: 0, y: 0 },
	scaleFactor: 1,
	workArea: { position: { x: 0, y: 0 }, size: { width: 1920, height: 1080 } },
};
function read(path: string): Record<string, unknown> {
	return JSON.parse(localStorage.getItem(`test-store:${path}`) ?? "{}");
}
if (!localStorage.getItem("test-store:settings.json")) {
	localStorage.setItem(
		"test-store:settings.json",
		JSON.stringify({
			settings: {
				...DEFAULT_SETTINGS,
				clientId: "browser-test-client",
				guildId: onboarding ? "" : "123456789012345678",
				token: "test-only-token",
			},
		}),
	);
}
mockWindows("settings", "overlay");
mockIPC(
	(cmd, payload) => {
		const args = payload as Record<string, unknown>;
		if (cmd === "plugin:store|load") {
			const id = paths.size + 1;
			paths.set(id, String(args.path));
			return id;
		}
		if (cmd.startsWith("plugin:store|")) {
			const path = paths.get(Number(args.rid));
			if (!path) throw new Error("Unknown test store");
			const data = read(path);
			if (cmd.endsWith("|get")) return [data[String(args.key)], String(args.key) in data];
			if (cmd.endsWith("|set")) {
				data[String(args.key)] = args.value;
				localStorage.setItem(`test-store:${path}`, JSON.stringify(data));
			}
			if (cmd.endsWith("|save") && localStorage.getItem("test-fail-save"))
				throw new Error("Simulated save failure");
			return null;
		}
		if (cmd === "plugin:window|available_monitors")
			return [monitor, { ...monitor, name: "Second display", position: { x: 1920, y: 0 } }];
		if (cmd === "plugin:window|current_monitor" || cmd === "plugin:window|primary_monitor")
			return monitor;
		if (cmd === "plugin:autostart|is_enabled")
			return localStorage.getItem("test-autostart") === "true";
		if (cmd === "plugin:autostart|enable" || cmd === "plugin:autostart|disable") {
			localStorage.setItem("test-autostart", String(cmd.endsWith("enable")));
			return null;
		}
		if (cmd === "update_tray_labels") {
			localStorage.setItem("test-tray-labels", JSON.stringify(args));
			return null;
		}
		if (cmd === "server_creator_logs") return [];
		if (cmd === "server_creator_status")
			return {
				platform: "macos",
				defaultInstallDir: "/test/server",
				installDir: "/test/server",
				sourceDir: "/test/server",
				botDir: "/test/server/bot",
				installed: false,
				configured: false,
				bunAvailable: true,
				bunPath: "/test/bun",
				gitAvailable: true,
				running: false,
				healthy: false,
				healthUrl: "http://127.0.0.1:3001/health",
				localWsUrl: "ws://127.0.0.1:3001/ws",
			};
		if (cmd === "plugin:app|version") return appPackage.version;
		if (cmd === "plugin:updater|check") return null;
		if (cmd === "plugin:window|is_visible") return true;
		if (cmd === "plugin:window|get_all_windows") return ["settings", "overlay"];
		return null;
	},
	{ shouldMockEvents: true },
);
await import("../../src/main-settings");
