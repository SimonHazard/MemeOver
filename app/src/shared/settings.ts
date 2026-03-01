import { emit } from "@tauri-apps/api/event";
import { Store } from "@tauri-apps/plugin-store";
import { DEFAULT_SETTINGS, type Settings } from "../shared/types";

export async function loadSettings(): Promise<Settings> {
	const store = await Store.load("settings.json");
	const saved = await store.get<Settings>("settings");
	// Merge with DEFAULT_SETTINGS so any field missing from an old settings.json
	// (e.g. enabledTypes, dndSchedule added after initial release) always has a value.
	return { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
}

export async function persistSettings(settings: Settings): Promise<void> {
	const store = await Store.load("settings.json");
	await store.set("settings", settings);
	await store.save();
	await emit("settings-changed", settings);
}
