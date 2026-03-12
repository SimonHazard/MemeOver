import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import type { EnabledTypes, OverlayHealth, WsStatus } from "@/shared/types";

export function statusVariant(
	status: WsStatus,
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "connected":
			return "default";
		case "connecting":
			return "secondary";
		case "error":
			return "destructive";
		case "disconnected":
			return "outline";
	}
}

export function overlayHealthVariant(h: OverlayHealth): "default" | "outline" {
	return h === "alive" ? "default" : "outline";
}

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

export async function skipCurrentItem(): Promise<void> {
	await emit("skip-current");
}

export function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
	});
}

// ─── Overlay helpers ──────────────────────────────────────────────────────────

export function enabledTypesToList(et: EnabledTypes): string[] {
	return (Object.keys(et) as Array<keyof EnabledTypes>).filter((k) => et[k]);
}

export function listToEnabledTypes(list: string[]): EnabledTypes {
	const result: EnabledTypes = {
		image: false,
		gif: false,
		video: false,
		audio: false,
		text: false,
	};
	for (const v of list) {
		if (v in result) result[v as keyof EnabledTypes] = true;
	}
	return result;
}
