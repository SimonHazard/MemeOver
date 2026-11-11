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

export function sameMonitorPosition(a: OverlayMonitor, b: OverlayMonitor): boolean {
	return a.x === b.x && a.y === b.y;
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
