import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import type { OverlayHealth, WsStatus } from "@/shared/types";

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
