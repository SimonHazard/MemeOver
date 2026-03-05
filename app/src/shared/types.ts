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

export type TextSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";

export interface EnabledTypes {
	image: boolean;
	gif: boolean;
	video: boolean;
	audio: boolean;
	text: boolean;
}

export interface Settings {
	guildId: string;
	token: string;
	/** WebSocket URL of the bot server, e.g. ws://localhost:3001/ws */
	wsUrl: string;
	/** Media width as a % of the viewport width (10–90) */
	mediaSize: number;
	/** Seconds to display each media item (1–30) */
	duration: number;
	/** Volume for video media (0–100) */
	volume: number;
	position: OverlayPosition;
	/** Which media types are allowed to be displayed */
	enabledTypes: EnabledTypes;
	/** Font size for text overlays */
	textSize: TextSize;
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
}

export const DEFAULT_SETTINGS: Settings = {
	guildId: "",
	token: "",
	wsUrl: "ws://localhost:3001/ws",
	mediaSize: 40,
	duration: 6,
	volume: 80,
	position: "center",
	enabledTypes: { image: true, gif: true, video: true, audio: true, text: true },
	textSize: "xl",
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
};
