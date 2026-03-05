// ─── WebSocket connection interface ───────────────────────────────────────────

/** Minimal structural interface over ElysiaWS — avoids generic any params. */
export interface WSConnection {
	readonly id: string;
	send(data: string | BufferSource): unknown;
	close(code?: number, reason?: string): void;
}

// ─── Media ────────────────────────────────────────────────────────────────────

import type { ExtractedMedia } from "../media/types";
export type { ExtractedMedia };

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
	MemberCountUpdateMessage,
} from "@memeover/shared";

// ─── Internal state ───────────────────────────────────────────────────────────

export interface ClientState {
	ws_id: string;
	ws_ref: WSConnection;
	joined_guilds: Set<string>;
}
