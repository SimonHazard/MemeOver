import { Elysia } from "elysia";
import { guildRegistry } from "./utils/registry";
import { ClientMessageSchema } from "./utils/schemas";
import { store } from "./utils/store";
import type {
	JoinMessage,
	LeaveMessage,
	MediaEvent,
	ServerMessage,
	TextEvent,
	WSConnection,
} from "./utils/types";

// ─── Broadcast ────────────────────────────────────────────────────────────────

/** Sends MEMBER_COUNT_UPDATE to every client in the guild with the current member count. */
function broadcastMemberCount(guildId: string): void {
	const memberIds = [...store.getGuildMembers(guildId)];
	const count = memberIds.length;
	const payload = JSON.stringify({
		type: "MEMBER_COUNT_UPDATE",
		guild_id: guildId,
		count,
	} satisfies ServerMessage);

	for (const wsId of memberIds) {
		const client = store.getClient(wsId);
		if (!client) continue;
		try {
			client.ws_ref.send(payload);
		} catch {
			// Ignore — the close handler will clean up stale sockets
		}
	}
}

export function broadcastToGuild(guildId: string, event: MediaEvent | TextEvent): void {
	// Snapshot the Set before iterating — removeClient() mutates the live Set
	const memberIds = [...store.getGuildMembers(guildId)];
	const payload = JSON.stringify(event satisfies ServerMessage);

	for (const wsId of memberIds) {
		const client = store.getClient(wsId);
		if (!client) continue;

		try {
			client.ws_ref.send(payload);
		} catch (err) {
			// Socket closed between check and send — clean up
			console.warn(`[WS] Failed to send to ${wsId}, removing:`, err);
			store.removeClient(wsId);
		}
	}
}

// ─── Rate limiting ─────────────────────────────────────────────────────────────

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 1_000;

interface RateLimitState {
	count: number;
	resetAt: number;
}

const rateLimiters = new Map<string, RateLimitState>();

/** Returns true if the message is allowed, false if rate-limited. */
function checkRateLimit(wsId: string): boolean {
	const now = Date.now();
	let state = rateLimiters.get(wsId);

	if (!state || now >= state.resetAt) {
		state = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
		rateLimiters.set(wsId, state);
	}

	state.count++;
	return state.count <= RATE_LIMIT_MAX;
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

const PING_INTERVAL_MS = 30_000;
const PONG_TIMEOUT_MS = 10_000;

interface HeartbeatState {
	pingInterval: ReturnType<typeof setInterval>;
	pongTimeout: ReturnType<typeof setTimeout> | null;
}

const heartbeats = new Map<string, HeartbeatState>();

function startHeartbeat(ws: WSConnection): void {
	const pingInterval = setInterval(() => {
		try {
			ws.send(JSON.stringify({ type: "PING" } satisfies ServerMessage));
		} catch {
			clearHeartbeat(ws.id);
			return;
		}

		const state = heartbeats.get(ws.id);
		if (!state) return;

		state.pongTimeout = setTimeout(() => {
			console.warn(`[WS] Client ${ws.id} missed PONG, closing connection`);
			clearHeartbeat(ws.id);
			// Capture guilds before removal so we can broadcast the updated count
			const guilds = [...(store.getClient(ws.id)?.joined_guilds ?? [])];
			store.removeClient(ws.id);
			for (const guildId of guilds) {
				broadcastMemberCount(guildId);
			}
			try {
				ws.close();
			} catch {
				// Already closed
			}
		}, PONG_TIMEOUT_MS);
	}, PING_INTERVAL_MS);

	heartbeats.set(ws.id, { pingInterval, pongTimeout: null });
}

function clearHeartbeat(wsId: string): void {
	const state = heartbeats.get(wsId);
	if (!state) return;
	clearInterval(state.pingInterval);
	if (state.pongTimeout) clearTimeout(state.pongTimeout);
	heartbeats.delete(wsId);
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

function handleJoin(ws: WSConnection, msg: JoinMessage): void {
	if (!guildRegistry.isRegistered(msg.guild_id)) {
		ws.send(
			JSON.stringify({
				type: "JOIN_ACK",
				guild_id: msg.guild_id,
				success: false,
				error: "Unknown guild — run /memeover setup in your Discord server first",
			} satisfies ServerMessage),
		);
		return;
	}

	if (!guildRegistry.verifyToken(msg.guild_id, msg.token)) {
		ws.send(
			JSON.stringify({
				type: "JOIN_ACK",
				guild_id: msg.guild_id,
				success: false,
				error: "Invalid token",
			} satisfies ServerMessage),
		);
		return;
	}

	// Idempotent: already joined → just ACK
	if (store.isClientInGuild(ws.id, msg.guild_id)) {
		ws.send(
			JSON.stringify({
				type: "JOIN_ACK",
				guild_id: msg.guild_id,
				success: true,
			} satisfies ServerMessage),
		);
		return;
	}

	store.joinGuild(ws.id, msg.guild_id);
	ws.send(
		JSON.stringify({
			type: "JOIN_ACK",
			guild_id: msg.guild_id,
			success: true,
		} satisfies ServerMessage),
	);
	console.log(`[WS] Client ${ws.id} joined guild ${msg.guild_id}`);
	broadcastMemberCount(msg.guild_id);
}

function handleLeave(ws: WSConnection, msg: LeaveMessage): void {
	store.leaveGuild(ws.id, msg.guild_id);
	console.log(`[WS] Client ${ws.id} left guild ${msg.guild_id}`);
	broadcastMemberCount(msg.guild_id);
}

// ─── Server factory ───────────────────────────────────────────────────────────

export function createServer() {
	return new Elysia()
		.get("/health", () => ({
			status: "ok" as const,
			uptime: process.uptime(),
			guilds: store.getAllGuildIds().length,
		}))
		.ws("/ws", {
			open(ws: WSConnection) {
				store.addClient(ws.id, ws);
				startHeartbeat(ws);
				console.log(`[WS] Client connected: ${ws.id}`);
			},

			message(ws: WSConnection, raw: unknown) {
				// Rate limiting
				if (!checkRateLimit(ws.id)) {
					ws.send(
						JSON.stringify({
							type: "ERROR",
							code: "RATE_LIMITED",
							message: "Too many messages — max 5 per second",
						} satisfies ServerMessage),
					);
					return;
				}

				// Parse JSON
				let parsed: unknown;
				try {
					const text = typeof raw === "string" ? raw : JSON.stringify(raw);
					parsed = JSON.parse(text);
				} catch {
					ws.send(
						JSON.stringify({
							type: "ERROR",
							code: "PARSE_ERROR",
							message: "Invalid JSON",
						} satisfies ServerMessage),
					);
					return;
				}

				// Validate with Zod
				const result = ClientMessageSchema.safeParse(parsed);
				if (!result.success) {
					ws.send(
						JSON.stringify({
							type: "ERROR",
							code: "VALIDATION_ERROR",
							message: "Invalid message format",
						} satisfies ServerMessage),
					);
					return;
				}

				const msg = result.data;

				switch (msg.type) {
					case "JOIN":
						handleJoin(ws, msg);
						break;
					case "LEAVE":
						handleLeave(ws, msg);
						break;
					case "PONG": {
						// Clear the pending pong timeout for this client
						const state = heartbeats.get(ws.id);
						if (state?.pongTimeout) {
							clearTimeout(state.pongTimeout);
							state.pongTimeout = null;
						}
						break;
					}
					default: {
						// TypeScript exhaustiveness guard
						const _: never = msg;
						void _;
					}
				}
			},

			close(ws: WSConnection) {
				clearHeartbeat(ws.id);
				rateLimiters.delete(ws.id);
				// Capture guilds before removal so we can broadcast the updated count
				const guilds = [...(store.getClient(ws.id)?.joined_guilds ?? [])];
				store.removeClient(ws.id);
				console.log(`[WS] Client disconnected: ${ws.id}`);
				for (const guildId of guilds) {
					broadcastMemberCount(guildId);
				}
			},
		});
}
