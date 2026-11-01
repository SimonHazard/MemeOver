import { isTauri } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";

/**
 * Emits a Tauri event from code that also runs in a plain browser (the OBS page).
 * Outside a Tauri webview there is no other window to notify, so it does nothing.
 */
export function emitIfTauri(event: string, payload?: unknown): Promise<void> {
	return isTauri() ? emit(event, payload) : Promise.resolve();
}
