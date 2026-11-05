import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { createMemoryStoreModule } from "../test-utils/tauri-mocks";
import { decodeSourceControls, SOURCE_COMMAND_LOG_LIMIT } from "./browser-source";
import { DEFAULT_SETTINGS, type Settings } from "./types";

// ─── Native side, as the settings window sees it ──────────────────────────────

const memory = createMemoryStoreModule();
const handlers = new Map<string, ((event: { payload: unknown }) => void)[]>();
const emitted: string[] = [];
const invoked: { command: string; args?: Record<string, unknown> }[] = [];
const native = {
	running: null as number | null,
	startError: null as string | null,
	trayFails: false,
	controlsDelay: null as Promise<void> | null,
	controlsFail: false,
	monitors: [] as unknown[],
	primary: null as unknown,
};

mock.module("@tauri-apps/plugin-store", () => memory.module);
mock.module("@tauri-apps/api/core", () => ({
	isTauri: () => true,
	async invoke(command: string, args?: Record<string, unknown>) {
		invoked.push({ command, args });
		if (command === "browser_source_status") return native.running;
		if (command === "browser_source_heartbeat") return { ageMs: 1, query: "source=1" };
		if (command === "set_tray_overlay_muted" && native.trayFails) throw new Error("No tray");
		if (command === "set_browser_source_controls") {
			if (native.controlsFail) throw new Error("Could not publish");
			await native.controlsDelay;
		}
		if (command === "start_browser_source") {
			if (native.startError) throw native.startError;
			native.running = args?.port as number;
			return native.running;
		}
		return null;
	},
}));
mock.module("@tauri-apps/api/event", () => ({
	// `emit` reaches the emitting window's own listeners too.
	async emit(event: string, payload?: unknown) {
		emitted.push(event);
		for (const handler of handlers.get(event) ?? []) handler({ payload });
	},
	async listen(event: string, handler: (event: { payload: unknown }) => void) {
		handlers.set(event, [...(handlers.get(event) ?? []), handler]);
		return () => {};
	},
}));
mock.module("@tauri-apps/api/window", () => ({
	availableMonitors: async () => native.monitors,
	currentMonitor: async () => null,
	primaryMonitor: async () => native.primary,
}));

const {
	initStreamControls,
	overlayReferenceSize,
	readSourceHeartbeat,
	refreshBrowserSourceStatus,
	setDesktopOverlayMuted,
	startBrowserSource,
} = await import("./stream-controls");
const { useAppStore } = await import("./store");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function saveSettings(patch: Partial<Settings>) {
	memory.stores.set(
		"settings.json",
		new Map([["settings", { ...DEFAULT_SETTINGS, clientId: "test-client-id", ...patch }]]),
	);
}
const savedSettings = () => memory.stores.get("settings.json")?.get("settings") as Settings;
const calls = (command: string) => invoked.filter((call) => call.command === command);
const lastCall = (command: string) => calls(command).slice(-1)[0];
const fire = (event: string, payload?: unknown) => {
	for (const handler of handlers.get(event) ?? []) handler({ payload });
};
const flush = () => new Promise((resolve) => setImmediate(resolve));

/** What loaded pages would read on their next check. */
function published() {
	const value = lastCall("set_browser_source_controls")?.args?.value;
	return decodeSourceControls(typeof value === "string" ? value : null);
}

const realSetInterval = globalThis.setInterval;
let watchdog: (() => void) | null = null;

beforeEach(() => {
	handlers.clear();
	invoked.length = 0;
	emitted.length = 0;
	Object.assign(native, {
		running: null,
		startError: null,
		trayFails: false,
		controlsDelay: null,
		controlsFail: false,
		monitors: [],
		primary: null,
	});
	watchdog = null;
	saveSettings({});
	useAppStore.setState({ browserSourceRunningPort: null, browserSourceError: null });
	globalThis.setInterval = ((callback: () => void) => {
		watchdog = callback;
		return 0;
	}) as unknown as typeof setInterval;
	spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
	globalThis.setInterval = realSetInterval;
	mock.restore();
});

// ─── Starting the server ──────────────────────────────────────────────────────

test("a started server is mirrored in the store and clears the previous error", async () => {
	useAppStore.setState({ browserSourceError: "port_in_use" });
	expect(await startBrowserSource(5000)).toBeNull();
	expect(calls("start_browser_source")[0]?.args).toEqual({ port: 5000 });
	expect(useAppStore.getState()).toMatchObject({
		browserSourceRunningPort: 5000,
		browserSourceError: null,
	});
});

for (const [native_error, code] of [
	["restart_required", "restart_required"],
	["port_in_use", "port_in_use"],
	["invalid_port", "invalid_port"],
	["Some plugin failure", "unknown"],
] as const) {
	test(`the native error "${native_error}" becomes the code "${code}"`, async () => {
		native.startError = native_error;
		expect(await startBrowserSource(5000)).toBe(code);
		expect(useAppStore.getState()).toMatchObject({
			browserSourceRunningPort: null,
			browserSourceError: code,
		});
	});
}

test("a live server is only mirrored, never started again", async () => {
	native.running = 5000;
	saveSettings({ browserSourceEnabled: true, browserSourcePort: 6000 });
	await refreshBrowserSourceStatus();
	expect(useAppStore.getState().browserSourceRunningPort).toBe(5000);
	expect(calls("start_browser_source")).toEqual([]);
});

test("a dead server restarts on the saved port, only while the source is enabled", async () => {
	saveSettings({ browserSourceEnabled: false });
	await refreshBrowserSourceStatus();
	expect(calls("start_browser_source")).toEqual([]);

	saveSettings({ browserSourceEnabled: true, browserSourcePort: 6000 });
	await refreshBrowserSourceStatus();
	expect(calls("start_browser_source")[0]?.args).toEqual({ port: 6000 });
	expect(useAppStore.getState().browserSourceRunningPort).toBe(6000);
});

test("the page's report is read from the native side", async () => {
	expect(await readSourceHeartbeat()).toEqual({ ageMs: 1, query: "source=1" });
});

// ─── Reference size ───────────────────────────────────────────────────────────

const monitor = (x: number, width: number, height: number, scaleFactor = 1) => ({
	position: { x, y: 0 },
	size: { width, height },
	scaleFactor,
});

test("the reference size is the short side of the overlay's screen, in CSS pixels", async () => {
	native.monitors = [monitor(0, 1920, 1080), monitor(1920, 2560, 1440, 1.25)];
	expect(await overlayReferenceSize({ x: 1920, y: 0 })).toBe(1152);
	native.monitors = [monitor(0, 1080, 1920)];
	expect(await overlayReferenceSize({ x: 0, y: 0 })).toBe(1080);
});

test("the reference size falls back to the primary screen, then to nothing", async () => {
	native.monitors = [monitor(0, 1920, 1080)];
	native.primary = monitor(0, 3840, 2160, 2);
	expect(await overlayReferenceSize({ x: 9999, y: 0 })).toBe(1080);
	expect(await overlayReferenceSize(null)).toBe(1080);
	native.primary = null;
	expect(await overlayReferenceSize(null)).toBeNull();
});

// ─── Desktop mute ─────────────────────────────────────────────────────────────

test("the desktop mute is saved, then the tray's checkmark follows it", async () => {
	expect((await setDesktopOverlayMuted(true)).desktopOverlayMuted).toBe(true);
	expect(savedSettings().desktopOverlayMuted).toBe(true);
	expect(lastCall("set_tray_overlay_muted")?.args).toEqual({ muted: true });

	await setDesktopOverlayMuted((settings) => !settings.desktopOverlayMuted);
	expect(savedSettings().desktopOverlayMuted).toBe(false);
	expect(lastCall("set_tray_overlay_muted")?.args).toEqual({ muted: false });
});

test("a tray that cannot update never loses the saved mute", async () => {
	native.trayFails = true;
	expect((await setDesktopOverlayMuted(true)).desktopOverlayMuted).toBe(true);
	expect(savedSettings().desktopOverlayMuted).toBe(true);
});

// ─── At launch ────────────────────────────────────────────────────────────────

test("launch restores the tray's checkmark and starts only an enabled source", async () => {
	saveSettings({ desktopOverlayMuted: true });
	await initStreamControls();
	expect(calls("set_tray_overlay_muted")[0]?.args).toEqual({ muted: true });
	expect(calls("start_browser_source")).toEqual([]);

	saveSettings({ browserSourceEnabled: true, browserSourcePort: 7000 });
	await initStreamControls();
	expect(calls("start_browser_source")[0]?.args).toEqual({ port: 7000 });
});

test("a tray click flips the saved mute: Rust only relays it", async () => {
	await initStreamControls();
	fire("overlay-mute-toggle-requested");
	await flush();
	await flush();
	expect(savedSettings().desktopOverlayMuted).toBe(true);
});

test("controls are published before the server starts, so no page reads an empty value", async () => {
	saveSettings({ browserSourceEnabled: true });
	await initStreamControls();
	const order = invoked.map((call) => call.command);
	expect(order.indexOf("set_browser_source_controls")).toBeGreaterThanOrEqual(0);
	expect(order.indexOf("set_browser_source_controls")).toBeLessThan(
		order.indexOf("start_browser_source"),
	);
});

test("each desktop action is published for loaded sources", async () => {
	const troll = { id: "111", username: "Troll", avatarUrl: "", mutedAt: 1 };
	saveSettings({ mutedAuthors: [troll], hideAnonymous: true });
	await initStreamControls();
	expect(published()).toMatchObject({ skip: 0, clear: 0, commandLog: "", hideAnonymous: true });
	expect(published()?.mutedAuthors.map((author) => author.id)).toEqual(["111"]);

	fire("skip-current");
	await flush();
	expect(published()).toMatchObject({ skip: 1, clear: 0, commandLog: "s" });
	fire("clear-queue");
	await flush();
	expect(published()).toMatchObject({ skip: 1, clear: 1, commandLog: "sc" });
	fire("settings-changed", { mutedAuthors: [], hideAnonymous: false });
	await flush();
	expect(published()).toMatchObject({
		skip: 1,
		clear: 1,
		commandLog: "sc",
		mutedAuthors: [],
		hideAnonymous: false,
	});
});

test("a burst preserves command order in a bounded header", async () => {
	await initStreamControls();
	for (let index = 0; index < SOURCE_COMMAND_LOG_LIMIT; index++) fire("skip-current");
	fire("clear-queue");
	fire("skip-current");
	await flush();
	expect(published()).toMatchObject({
		skip: SOURCE_COMMAND_LOG_LIMIT + 1,
		clear: 1,
		commandLog: `${"s".repeat(SOURCE_COMMAND_LOG_LIMIT - 2)}cs`,
	});
});

test("a delayed publication cannot be overtaken by the next command", async () => {
	await initStreamControls();
	let release = () => {};
	native.controlsDelay = new Promise<void>((resolve) => {
		release = resolve;
	});
	fire("skip-current");
	fire("clear-queue");
	await flush();
	expect(calls("set_browser_source_controls")).toHaveLength(2);
	expect(published()?.commandLog).toBe("s");
	release();
	await flush();
	expect(published()?.commandLog).toBe("sc");
});

test("a failed publication does not block the next one from carrying all actions", async () => {
	await initStreamControls();
	native.controlsFail = true;
	fire("skip-current");
	await flush();
	native.controlsFail = false;
	fire("clear-queue");
	await flush();
	expect(published()).toMatchObject({ skip: 1, clear: 1, commandLog: "sc" });
});

test("published values carry ids only, never credentials", async () => {
	saveSettings({ guildId: "123456789012345678", token: "secret-token" });
	await initStreamControls();
	const value = String(lastCall("set_browser_source_controls")?.args?.value);
	expect(Buffer.from(value, "base64url").toString()).not.toContain("secret-token");
});

// ─── Watchdog ─────────────────────────────────────────────────────────────────

async function tick() {
	watchdog?.();
	await flush();
	await flush();
}
const announcements = () => emitted.filter((event) => event === "browser-source-start-failed");

test("a failed start is retried and announced once, not on every retry", async () => {
	saveSettings({ browserSourceEnabled: true });
	native.startError = "port_in_use";
	await initStreamControls();
	expect(announcements()).toEqual([]);

	await tick();
	await tick();
	await tick();
	expect(announcements()).toHaveLength(1);
	expect(calls("start_browser_source").length).toBe(4);
});

test("a freed port recovers on its own, and a later failure is announced again", async () => {
	saveSettings({ browserSourceEnabled: true });
	native.startError = "port_in_use";
	await initStreamControls();
	await tick();

	native.startError = null;
	await tick();
	expect(useAppStore.getState()).toMatchObject({
		browserSourceRunningPort: DEFAULT_SETTINGS.browserSourcePort,
		browserSourceError: null,
	});

	native.running = null;
	native.startError = "port_in_use";
	await tick();
	expect(announcements()).toHaveLength(2);
});

test("a disabled source is neither restarted nor announced", async () => {
	await initStreamControls();
	await tick();
	expect(calls("start_browser_source")).toEqual([]);
	expect(announcements()).toEqual([]);
});

test("a status that cannot be read does not break the watchdog", async () => {
	await initStreamControls();
	const failing = spyOn(useAppStore, "getState").mockImplementation(() => {
		throw new Error("Simulated failure");
	});
	await tick();
	failing.mockRestore();
	await tick();
	expect(announcements()).toEqual([]);
});
