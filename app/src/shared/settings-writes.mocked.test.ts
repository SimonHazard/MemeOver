import { beforeEach, expect, mock, test } from "bun:test";
import { createEventModule, createMemoryStoreModule } from "../test-utils/tauri-mocks";
import { DEFAULT_SETTINGS } from "./types";

const memory = createMemoryStoreModule();
const events = createEventModule();
let failure: "load" | "save" | "emit" | null = null;
mock.module("@tauri-apps/plugin-store", () => ({
	Store: {
		async load(name: string) {
			if (failure === "load") {
				failure = null;
				throw new Error("Simulated load failure");
			}
			const store = await memory.module.Store.load(name);
			return {
				...store,
				async save() {
					if (failure === "save") {
						failure = null;
						throw new Error("Simulated save failure");
					}
					await store.save();
				},
			};
		},
	},
}));
mock.module("@tauri-apps/api/event", () => ({
	...events.module,
	async emit(event: string, payload?: unknown) {
		if (failure === "emit") {
			failure = null;
			throw new Error("Simulated emit failure");
		}
		await events.module.emit(event, payload);
	},
}));
const { loadSettings, patchSettings } = await import("./settings");

beforeEach(() => {
	failure = null;
	memory.stores.clear();
	memory.saves.clear();
	events.emitted.length = 0;
	memory.stores.set(
		"settings.json",
		new Map([["settings", { ...DEFAULT_SETTINGS, clientId: "test-client-id", volume: 50 }]]),
	);
});

test("concurrent edits preserve both fields and emit each persisted state in order", async () => {
	const [volume, anonymous] = await Promise.all([
		patchSettings((settings) => ({ ...settings, volume: 25 })),
		patchSettings((settings) => ({ ...settings, hideAnonymous: true })),
	]);
	expect(volume).toMatchObject({ volume: 25, hideAnonymous: false });
	expect(anonymous).toMatchObject({ volume: 25, hideAnonymous: true });
	expect(await loadSettings()).toEqual(anonymous);
	expect(memory.saves.get("settings.json")).toBe(2);
	expect(events.emitted).toEqual([
		{ event: "settings-changed", payload: volume },
		{ event: "settings-changed", payload: anonymous },
	]);
});

test("concurrent first-run edits share the initialized client identity", async () => {
	memory.stores.clear();
	const [volume, anonymous] = await Promise.all([
		patchSettings((settings) => ({ ...settings, volume: 25 })),
		patchSettings((settings) => ({ ...settings, hideAnonymous: true })),
	]);
	expect(anonymous).toMatchObject({
		clientId: volume.clientId,
		volume: 25,
		hideAnonymous: true,
	});
	expect(anonymous.clientId.length).toBeGreaterThanOrEqual(8);
	expect(await loadSettings()).toEqual(anonymous);
});

test("concurrent edits to the same field run in call order against the latest value", async () => {
	const results = await Promise.all(
		Array.from({ length: 3 }, () =>
			patchSettings((settings) => ({ ...settings, volume: settings.volume + 1 })),
		),
	);
	expect(results.map((settings) => settings.volume)).toEqual([51, 52, 53]);
	expect((await loadSettings()).volume).toBe(53);
});

test("a throwing mutator rejects its caller and the queued edit still runs", async () => {
	const [failed, succeeded] = await Promise.allSettled([
		patchSettings(() => {
			throw new Error("Simulated mutator failure");
		}),
		patchSettings((settings) => ({ ...settings, hideAnonymous: true })),
	]);
	expect(failed).toMatchObject({
		status: "rejected",
		reason: new Error("Simulated mutator failure"),
	});
	expect(succeeded).toMatchObject({
		status: "fulfilled",
		value: { volume: 50, hideAnonymous: true },
	});
	expect(await loadSettings()).toMatchObject({ volume: 50, hideAnonymous: true });
	expect(events.emitted).toHaveLength(1);
});

for (const stage of ["load", "save", "emit"] as const) {
	test(`a ${stage} failure rejects its caller without blocking queued and later edits`, async () => {
		failure = stage;
		const [failed, succeeded] = await Promise.allSettled([
			patchSettings((settings) => ({ ...settings, volume: 25 })),
			patchSettings((settings) => ({ ...settings, hideAnonymous: true })),
		]);
		expect(failed).toMatchObject({
			status: "rejected",
			reason: new Error(`Simulated ${stage} failure`),
		});
		expect(succeeded).toMatchObject({ status: "fulfilled", value: { hideAnonymous: true } });
		const later = await patchSettings((settings) => ({ ...settings, historyAutoPurge: false }));
		expect(later).toMatchObject({ hideAnonymous: true, historyAutoPurge: false });
		expect(await loadSettings()).toEqual(later);
	});
}
