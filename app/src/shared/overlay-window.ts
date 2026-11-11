import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { availableMonitors, currentMonitor } from "@tauri-apps/api/window";
import { sameMonitorPosition } from "./helpers";
import type { OverlayMonitor } from "./types";

export async function showOverlay(): Promise<void> {
	await invoke("ensure_overlay_visible");
}

export async function reloadOverlay(): Promise<void> {
	await invoke("reload_overlay");
}

export async function quitOverlay(): Promise<void> {
	await invoke("quit_overlay");
}

export async function clearQueue(): Promise<void> {
	await emit("clear-queue");
}

export async function restoreOverlayMonitor(saved: OverlayMonitor): Promise<void> {
	try {
		// Skip the move if the overlay is already on the correct monitor.
		// This avoids a hide→resize→show flash on every reload (Reload button,
		// ensure_overlay_visible, etc.) when the window is already in the right place.
		const current = await currentMonitor();
		if (current && sameMonitorPosition(current.position, saved)) {
			return;
		}

		const monitors = await availableMonitors();
		const idx = monitors.findIndex((m) => sameMonitorPosition(m.position, saved));
		if (idx !== -1) {
			await invoke("move_overlay_to_monitor", { monitorIndex: idx });
		}
	} catch (e) {
		console.warn("[Monitor] Could not restore overlay monitor:", e);
	}
}

// Callers already have the monitor list; reuse its identifier instead of querying again.
export async function moveOverlayToMonitor(
	monitorIndex: number,
	identifier: OverlayMonitor,
): Promise<OverlayMonitor | null> {
	try {
		await invoke("move_overlay_to_monitor", { monitorIndex });
		return identifier;
	} catch (e) {
		console.warn("[Monitor] Could not move overlay:", e);
		return null;
	}
}

export async function skipCurrentItem(): Promise<void> {
	await emit("skip-current");
}
