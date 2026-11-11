import { emit } from "@tauri-apps/api/event";
import { Store } from "@tauri-apps/plugin-store";
import { normalizeSettings } from "./settings-normalization";
import { CURRENT_SCHEMA_VERSION, type Settings } from "./types";

export async function loadSettings(): Promise<Settings> {
	const store = await Store.load("settings.json");
	const saved = await store.get<unknown>("settings");
	const settings = normalizeSettings(saved);
	const shouldPersistNormalized =
		!saved ||
		typeof saved !== "object" ||
		(saved as Record<string, unknown>).schemaVersion !== CURRENT_SCHEMA_VERSION ||
		typeof (saved as Record<string, unknown>).clientId !== "string" ||
		((saved as Record<string, unknown>).clientId as string).length < 8;

	if (shouldPersistNormalized) {
		await store.set("settings", settings);
		await store.save();
	}

	return settings;
}

/** Replace the complete settings snapshot; use patchSettings for partial edits. */
export async function persistSettings(settings: Settings): Promise<void> {
	const store = await Store.load("settings.json");
	await store.set("settings", settings);
	await store.save();
	await emit("settings-changed", settings);
}

let settingsPatchQueue: Promise<void> = Promise.resolve();

/** Serialize read/merge/save/notify in this window so concurrent edits see the latest write. */
export function patchSettings(mutator: (settings: Settings) => Settings): Promise<Settings> {
	const pending = settingsPatchQueue.then(async () => {
		const updated = normalizeSettings(mutator(await loadSettings()));
		await persistSettings(updated);
		return updated;
	});
	// Keep each caller's rejection while allowing later edits to run after a failed operation.
	settingsPatchQueue = pending.then(
		() => undefined,
		() => undefined,
	);
	return pending;
}
