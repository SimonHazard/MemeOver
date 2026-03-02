// ─── Protocol types (source of truth: @memeover/shared) ───────────────────────

export type {
	ClientMessage,
	ErrorCode,
	ErrorMessage,
	JoinAckMessage,
	JoinMessage,
	LeaveMessage,
	MediaEvent,
	MediaType,
	PingMessage,
	PongMessage,
	ServerMessage,
	TextEvent,
} from "@memeover/shared";

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

export type OverlayPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type TextSize = "sm" | "base" | "lg" | "xl" | "2xl";

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
};
