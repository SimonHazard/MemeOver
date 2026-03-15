import { emit } from "@tauri-apps/api/event";
import { Store } from "@tauri-apps/plugin-store";
import { DEFAULT_SETTINGS, type Settings } from "../shared/types";

export async function loadSettings(): Promise<Settings> {
	const store = await Store.load("settings.json");
	const saved = await store.get<Settings>("settings");
	// Shallow merge for top-level fields — new fields not in old settings.json get defaults.
	// Deep merge for enabledTypes: a new media type (e.g. "sticker") added after the initial
	// release must not be silently dropped when the saved object overwrites the default.
	return {
		...DEFAULT_SETTINGS,
		...(saved ?? {}),
		enabledTypes: { ...DEFAULT_SETTINGS.enabledTypes, ...(saved?.enabledTypes ?? {}) },
	};
}

export async function persistSettings(settings: Settings): Promise<void> {
	const store = await Store.load("settings.json");
	await store.set("settings", settings);
	await store.save();
	await emit("settings-changed", settings);
}
