import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { availableMonitors, currentMonitor } from "@tauri-apps/api/window";
import type { EnabledTypes, OverlayHealth, OverlayMonitor, WsStatus } from "@/shared/types";

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

/**
 * Moves the overlay to the monitor matching the saved OverlayMonitor identifier.
 * Silently no-ops if the monitor is no longer connected.
 */
/** Returns true if two monitor positions refer to the same physical screen. */
export function sameMonitorPosition(a: OverlayMonitor, b: OverlayMonitor): boolean {
	return a.x === b.x && a.y === b.y;
}

export async function restoreOverlayMonitor(saved: OverlayMonitor): Promise<void> {
	try {
		// Skip the move if the overlay is already on the correct monitor.
		// This avoids an unmaximize→maximize flash on every reload (Reload button,
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

/**
 * Moves the overlay to the monitor at the given index.
 * The caller must supply the identifier (physical position) — no redundant
 * availableMonitors() call since callers already have the monitor list loaded.
 * Returns true on success, false on failure.
 */
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

// ─── Inline emoji parsing ─────────────────────────────────────────────────────

export type TextSegment =
	| { kind: "text"; value: string; offset: number }
	| { kind: "emoji"; id: string; name: string; animated: boolean; offset: number };

const INLINE_EMOJI_RE = /<(a?):(\w+):(\d+)>/g;

/** Build a Discord CDN URL for a custom emoji. No expiry — emoji assets are permanent. */
export function emojiUrl(id: string, animated: boolean): string {
	return animated
		? `https://cdn.discordapp.com/emojis/${id}.gif`
		: `https://cdn.discordapp.com/emojis/${id}.webp`;
}

export function parseInlineEmojis(text: string): TextSegment[] {
	const segments: TextSegment[] = [];
	let lastIndex = 0;

	for (const match of text.matchAll(INLINE_EMOJI_RE)) {
		const matchStart = match.index;
		if (matchStart > lastIndex) {
			segments.push({ kind: "text", value: text.slice(lastIndex, matchStart), offset: lastIndex });
		}
		segments.push({
			kind: "emoji",
			id: match[3],
			name: match[2],
			animated: match[1] === "a",
			offset: matchStart,
		});
		lastIndex = matchStart + match[0].length;
	}

	if (lastIndex < text.length) {
		segments.push({ kind: "text", value: text.slice(lastIndex), offset: lastIndex });
	}

	return segments;
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
		sticker: false,
	};
	for (const v of list) {
		if (v in result) result[v as keyof EnabledTypes] = true;
	}
	return result;
}
