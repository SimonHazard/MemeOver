// ─── WebSocket connection interface ───────────────────────────────────────────

/** Minimal structural interface over ElysiaWS — avoids generic any params. */
export interface WSConnection {
	readonly id: string;
	send(data: string | BufferSource): unknown;
	close(code?: number, reason?: string): void;
}

// ─── Internal state ───────────────────────────────────────────────────────────

export interface ClientState {
	ws_id: string;
	ws_ref: WSConnection;
	joined_guilds: Set<string>;
	/** Stable app install id from JOIN, shared by a reconnecting install's old and new sockets. */
	client_id?: string;
}
