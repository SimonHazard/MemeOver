// ─── App-level ────────────────────────────────────────────────────────────────
import type { MediaEvent, TextEvent } from "@memeover/shared";

/** MediaEvent enriched with a unique per-display ID for React keys / queue dedup */
export interface MediaQueueItem extends MediaEvent {
	queueId: string;
}

/** TextEvent enriched with a unique per-display ID for React keys / queue dedup */
export interface TextQueueItem extends TextEvent {
	queueId: string;
}

/**
 * Union discriminée sur `type` : "MEDIA" | "TEXT".
 * Tout ce qui peut apparaître dans la file d'affichage.
 */
export type DisplayQueueItem = MediaQueueItem | TextQueueItem;

export type WsStatus = "disconnected" | "connecting" | "connected" | "error";

/** Santé de la fenêtre overlay (alive = existe et visible, closed = détruite) */
export type OverlayHealth = "alive" | "closed";

export const FLOATING_REACTION_ANIMATIONS = [
	"straight",
	"serpentine",
	"bounce",
	"confetti",
	"pop",
	"firework",
] as const;

export const FLOATING_REACTION_PRESETS = [...FLOATING_REACTION_ANIMATIONS, "random"] as const;

export type FloatingReactionAnimation = (typeof FLOATING_REACTION_ANIMATIONS)[number];
export type FloatingReactionPreset = FloatingReactionAnimation | "random";

/**
 * One in-flight floating emoji. `leftPct` and `durationMs` are randomised at
 * spawn time (not render time) so the overlay renders deterministically even
 * across React re-renders / strict mode double invocations.
 */
export interface FloatingReaction {
	id: string;
	/** Unicode char sequence for unicode emojis, or the custom emoji name (used as alt text when `emojiUrl` is set). */
	emoji: string;
	/** CDN URL for Discord custom emojis (PNG or animated GIF). Absent for unicode — overlay renders the `emoji` glyph directly. */
	emojiUrl?: string;
	/** Horizontal position as a % of viewport width (0–100). */
	leftPct: number;
	/** Total animation duration in milliseconds (typically 4000–6000). */
	durationMs: number;
	animation: FloatingReactionAnimation;
	/** Maximum opacity as a percentage (0–100). */
	opacityPct: number;
	/** Emoji size in viewport-min units. */
	sizeVmin: number;
	/** Fade-in completion point, expressed as animation progress (0–100). */
	fadeInPct: number;
	/** Fade-out start point, expressed as animation progress (0–100). */
	fadeOutPct: number;
	/** Horizontal movement amplitude in viewport-width units. */
	amplitudeVw: number;
	/** Direction of horizontal travel for side-to-side presets. */
	direction: -1 | 1;
	/** Signed rotation amount in degrees. */
	rotationDeg: number;
}

/** Physical coordinates of a monitor's top-left corner — used as a stable identifier across sessions */
export interface OverlayMonitor {
	x: number;
	y: number;
}

export type OverlayPosition =
	| "center"
	| "top-left"
	| "top"
	| "top-right"
	| "left"
	| "right"
	| "bottom-left"
	| "bottom"
	| "bottom-right";

/** @deprecated Legacy enum — kept only for settings migration. Use numeric pixels instead. */
export type TextSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";

export type TextPosition = "above" | "below" | "overlay-top" | "overlay-middle" | "overlay-bottom";

export interface EnabledTypes {
	image: boolean;
	gif: boolean;
	video: boolean;
	audio: boolean;
	text: boolean;
	sticker: boolean;
}

export interface Settings {
	guildId: string;
	token: string;
	/** WebSocket URL of the bot server. Hidden from UI unless `expertMode` is on. */
	wsUrl: string;
	/** When true, reveals advanced fields (custom wsUrl). Off by default to streamline onboarding. */
	expertMode: boolean;
	/** Maximum size of the media's largest dimension as a % of vmin (10–90).
	 *  With the fit-box renderer, the media fits a `mediaSize × mediaSize` vmin
	 *  square while preserving its aspect ratio. */
	mediaSize: number;
	/** Seconds to display each media item (1–30) */
	duration: number;
	/** Volume for video media (0–100) */
	volume: number;
	position: OverlayPosition;
	/** Fine-tune X offset from the anchor, in % of viewport width (-20 to +20) */
	positionOffsetX: number;
	/** Fine-tune Y offset from the anchor, in % of viewport height (-20 to +20) */
	positionOffsetY: number;
	/** Which media types are allowed to be displayed */
	enabledTypes: EnabledTypes;
	/** Monotonic schema version; bumped when a load-time migration of persisted fields is required */
	schemaVersion: number;
	/** Font size for text overlays, in pixels (12–96) */
	textSize: number;
	/** Where the caption / text sits relative to the media */
	textPosition: TextPosition;
	/** Opacity of the media element (0 = invisible, 100 = fully opaque) */
	mediaOpacity: number;
	/** When true, video/audio overlays stay visible until the media ends (ignores duration timer) */
	syncMediaDuration: boolean;
	/** Enable a background container wrapping the entire overlay (badge + media + caption) */
	bgEnabled: boolean;
	/** Background fill color (HEX) */
	bgColor: string;
	/** Background fill opacity (0–100) */
	bgOpacity: number;
	/** Background border color (HEX) */
	bgBorderColor: string;
	/** Background border opacity (0–100) */
	bgBorderOpacity: number;
	/** Background border width in px (0–20) */
	bgBorderWidth: number;
	/** Background border radius in px (0–50) */
	bgBorderRadius: number;
	/** Background inner padding in px (0–100) */
	bgPadding: number;
	/** Text color for text overlays (HEX) */
	textColor: string;
	/** Physical origin (x, y) of the monitor where the overlay should appear; null = primary monitor */
	overlayMonitor: OverlayMonitor | null;
	/** When true, reactions added in a watched channel float as translucent emojis across the overlay. */
	floatingReactionsEnabled: boolean;
	/** Motion preset used by floating reactions. */
	floatingReactionPreset: FloatingReactionPreset;
	/** Total floating reaction animation duration, in seconds. */
	floatingReactionDuration: number;
	/** Floating reaction maximum opacity (0 = invisible, 100 = fully opaque). */
	floatingReactionOpacity: number;
	/** Emoji size for floating reactions, in vmin. */
	floatingReactionSize: number;
}

/** Current settings schema version. Bump + add a branch in `migrateSettings` when introducing a breaking change. */
export const CURRENT_SCHEMA_VERSION = 6;

/** WS URL shipped by default (hosted bot). Only swapped-in for fresh installs or users who still had the legacy localhost default. */
export const DEFAULT_WS_URL = "wss://bot-memeover.simonhazard.com/ws";
/** Pre-v2 default. Migration treats anything matching this as "never touched" and upgrades it silently. */
export const LEGACY_DEFAULT_WS_URL = "ws://localhost:3001/ws";

export const DEFAULT_SETTINGS: Settings = {
	guildId: "",
	token: "",
	wsUrl: DEFAULT_WS_URL,
	expertMode: false,
	mediaSize: 60,
	duration: 6,
	volume: 80,
	position: "center",
	positionOffsetX: 0,
	positionOffsetY: 0,
	enabledTypes: { image: true, gif: true, video: true, audio: true, text: true, sticker: true },
	schemaVersion: CURRENT_SCHEMA_VERSION,
	textSize: 20,
	textPosition: "overlay-bottom",
	mediaOpacity: 100,
	syncMediaDuration: false,
	bgEnabled: false,
	bgColor: "#000000",
	bgOpacity: 70,
	bgBorderColor: "#000000",
	bgBorderOpacity: 0,
	bgBorderWidth: 0,
	bgBorderRadius: 12,
	bgPadding: 16,
	textColor: "#FFFFFF",
	overlayMonitor: null,
	floatingReactionsEnabled: true,
	floatingReactionPreset: "random",
	floatingReactionDuration: 5,
	floatingReactionOpacity: 82,
	floatingReactionSize: 6,
};
