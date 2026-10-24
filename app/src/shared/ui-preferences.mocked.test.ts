import { afterAll, afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";

let native = true;
let failEmit = false;
const emitted: unknown[] = [];
const pending: {
	handler: (event: { payload: unknown }) => void;
	resolve: (stop: () => void) => void;
	reject: (error: Error) => void;
}[] = [];
mock.module("@tauri-apps/api/core", () => ({ isTauri: () => native }));
mock.module("@tauri-apps/api/event", () => ({
	emit: async (_name: string, payload: unknown) => {
		if (failEmit) throw new Error("Simulated IPC failure");
		emitted.push(payload);
	},
	listen: (_name: string, handler: (event: { payload: unknown }) => void) =>
		new Promise<() => void>((resolve, reject) => pending.push({ handler, resolve, reject })),
}));
const { saveUiPreference, subscribeUiPreference, UI_PREFERENCE_EVENT } = await import(
	"./ui-preferences"
);

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const stops: (() => void)[] = [];
beforeEach(() => {
	Object.defineProperty(globalThis, "window", { configurable: true, value: new EventTarget() });
	localStorage.clear();
	native = true;
	failEmit = false;
	pending.length = 0;
	emitted.length = 0;
});
afterEach(() => {
	for (const stop of stops.splice(0)) stop();
	localStorage.clear();
});
afterAll(() => {
	if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
	else Reflect.deleteProperty(globalThis, "window");
});
function subscribe(key: "lang" | "theme", callback: () => void) {
	const stop = subscribeUiPreference(key, callback);
	stops.push(stop);
	return stop;
}
function storage(key: string | null, storageArea: Storage = localStorage) {
	window.dispatchEvent(Object.assign(new Event("storage"), { key, storageArea }));
}
function message(key: string, value: string, revision = 1) {
	return { key, value, source: "other-window", revision };
}

test("a subscription disposed before native listen resolves cannot receive events or leak", async () => {
	const changed = mock();
	const stop = subscribe("lang", changed);
	stop();
	const unlisten = mock();
	pending[0].handler({ payload: message("lang", "fr") });
	pending[0].resolve(unlisten);
	await Promise.resolve();
	expect(unlisten).toHaveBeenCalledTimes(1);
	expect(changed).not.toHaveBeenCalled();
	expect(localStorage.getItem("lang")).toBeNull();
	stop();
	expect(unlisten).toHaveBeenCalledTimes(1);
});

test("StrictMode cleanup and resubscription keep only the new native listener active", async () => {
	const stale = mock();
	subscribe("theme", stale)();
	const current = mock();
	const stop = subscribe("theme", current);
	const oldUnlisten = mock();
	const newUnlisten = mock();
	pending[1].resolve(newUnlisten);
	pending[0].resolve(oldUnlisten);
	await Promise.resolve();
	expect(current).toHaveBeenCalledTimes(1);
	pending[0].handler({ payload: message("theme", "light") });
	expect(stale).not.toHaveBeenCalled();
	expect(localStorage.getItem("theme")).toBeNull();
	pending[1].handler({ payload: message("theme", "dark") });
	expect(localStorage.getItem("theme")).toBe("dark");
	expect(current).toHaveBeenCalledTimes(2);
	expect(oldUnlisten).toHaveBeenCalledTimes(1);
	stop();
	stop();
	pending[1].handler({ payload: message("theme", "light", 2) });
	expect(localStorage.getItem("theme")).toBe("dark");
	expect(newUnlisten).toHaveBeenCalledTimes(1);
});

test("native notifications validate the payload, persist it and never echo it", async () => {
	const changed = mock();
	subscribe("lang", changed);
	localStorage.setItem("lang", "en");
	pending[0].resolve(() => {});
	await Promise.resolve();
	changed.mockClear();
	for (const payload of [null, {}, { key: "lang", value: "xx" }, { key: "theme", value: "dark" }]) {
		pending[0].handler({ payload });
	}
	expect(changed).not.toHaveBeenCalled();
	expect(localStorage.getItem("lang")).toBe("en");
	pending[0].handler({ payload: message("lang", "fr") });
	expect(changed).toHaveBeenCalledTimes(1);
	expect(localStorage.getItem("lang")).toBe("fr");
	expect(emitted).toEqual([]);
});

test("an old native echo cannot overwrite a newer local preference", async () => {
	subscribe("theme", () => {});
	pending[0].resolve(() => {});
	await Promise.resolve();
	saveUiPreference({ key: "theme", value: "dark" });
	saveUiPreference({ key: "theme", value: "light" });
	pending[0].handler({ payload: emitted[0] });
	expect(localStorage.getItem("theme")).toBe("light");
});

test("duplicate and out-of-order remote messages do not replay an older preference", async () => {
	const changed = mock();
	subscribe("lang", changed);
	pending[0].resolve(() => {});
	await Promise.resolve();
	changed.mockClear();
	pending[0].handler({ payload: message("lang", "fr", 2) });
	pending[0].handler({ payload: message("lang", "en", 1) });
	pending[0].handler({ payload: message("lang", "fr", 2) });
	expect(localStorage.getItem("lang")).toBe("fr");
	expect(changed).toHaveBeenCalledTimes(1);
});

test("browser subscriptions handle own changes, other windows and clear, then clean up", () => {
	native = false;
	const changed = mock();
	const stop = subscribe("lang", changed);
	saveUiPreference({ key: "theme", value: "dark" });
	storage("unrelated");
	storage("lang", {} as Storage);
	expect(changed).not.toHaveBeenCalled();
	saveUiPreference({ key: "lang", value: "fr" });
	storage("lang");
	storage(null);
	expect(changed).toHaveBeenCalledTimes(3);
	stop();
	saveUiPreference({ key: "lang", value: "en" });
	storage(null);
	window.dispatchEvent(
		new CustomEvent(UI_PREFERENCE_EVENT, { detail: { key: "lang", value: "fr" } }),
	);
	expect(changed).toHaveBeenCalledTimes(3);
	expect(pending).toHaveLength(0);
	expect(emitted).toEqual([]);
});

test("a rejected native subscription keeps the browser path available without unhandled rejection", async () => {
	const warn = spyOn(console, "warn").mockImplementation(() => {});
	try {
		const changed = mock();
		subscribe("lang", changed);
		pending[0].reject(new Error("Simulated listen failure"));
		await Promise.resolve();
		await Promise.resolve();
		saveUiPreference({ key: "lang", value: "fr" });
		expect(changed).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledTimes(1);
	} finally {
		warn.mockRestore();
	}
});

test("page navigation cancels a pending native subscription and cached-page restore starts a fresh one", async () => {
	const changed = mock();
	const stop = subscribe("lang", changed);
	window.dispatchEvent(new Event("pagehide"));
	pending[0].handler({ payload: message("lang", "fr") });
	expect(changed).not.toHaveBeenCalled();
	window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
	expect(pending).toHaveLength(2);
	const oldUnlisten = mock();
	const currentUnlisten = mock();
	pending[1].resolve(currentUnlisten);
	pending[0].resolve(oldUnlisten);
	await Promise.resolve();
	expect(oldUnlisten).toHaveBeenCalledTimes(1);
	pending[0].handler({ payload: message("lang", "fr") });
	expect(localStorage.getItem("lang")).toBeNull();
	pending[1].handler({ payload: message("lang", "en") });
	expect(localStorage.getItem("lang")).toBe("en");
	stop();
	expect(currentUnlisten).toHaveBeenCalledTimes(1);
	window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
	expect(pending).toHaveLength(2);
});

test("browser preference changes are reread when a cached page is restored", () => {
	native = false;
	const changed = mock();
	subscribe("theme", changed);
	window.dispatchEvent(new Event("pagehide"));
	saveUiPreference({ key: "theme", value: "dark" });
	expect(changed).not.toHaveBeenCalled();
	window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
	expect(changed).toHaveBeenCalledTimes(1);
	expect(localStorage.getItem("theme")).toBe("dark");
});

test("async native cleanup rejections are handled after both immediate and delayed disposal", async () => {
	const warn = spyOn(console, "warn").mockImplementation(() => {});
	try {
		const reject = async () => {
			throw new Error("Simulated unlisten failure");
		};
		const stop = subscribe("lang", () => {});
		pending[0].resolve(reject);
		await Promise.resolve();
		stop();
		await Promise.resolve();
		expect(warn).toHaveBeenCalledTimes(1);
		subscribe("theme", () => {})();
		pending[1].resolve(reject);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(warn).toHaveBeenCalledTimes(2);
	} finally {
		warn.mockRestore();
	}
});

test("a rejected native broadcast preserves the local preference and handles the rejection", async () => {
	const warn = spyOn(console, "warn").mockImplementation(() => {});
	try {
		failEmit = true;
		saveUiPreference({ key: "theme", value: "dark" });
		await Promise.resolve();
		expect(localStorage.getItem("theme")).toBe("dark");
		expect(warn).toHaveBeenCalledTimes(1);
	} finally {
		warn.mockRestore();
	}
});
