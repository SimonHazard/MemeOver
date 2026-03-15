import { timingSafeEqual } from "node:crypto";
import { Elysia } from "elysia";
import { config } from "./utils/config";
import { logger } from "./utils/logger";
import { guildRegistry } from "./utils/registry";
import { ClientMessageSchema } from "./utils/schemas";
import { stats } from "./utils/stats";
import { store } from "./utils/store";
import type {
	JoinMessage,
	LeaveMessage,
	MediaEvent,
	ServerMessage,
	TextEvent,
	WSConnection,
} from "./utils/types";

const log = logger.child({ module: "server" });

// Pre-compute once at startup to avoid per-request allocation
const metricsTokenBuf = config.metricsToken ? Buffer.from(config.metricsToken) : null;

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
			log.warn({ wsId, event: "send_failed", err }, "Failed to send to client, removing");
			store.removeClient(wsId);
		}
	}

	// Counts broadcast events (one per Discord message), not per-recipient sends
	stats.messageBroadcast();
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
			log.warn(
				{ wsId: ws.id, event: "heartbeat_timeout" },
				"Client missed PONG, closing connection",
			);
			stats.errorHeartbeatTimeout();
			clearHeartbeat(ws.id);
			rateLimiters.delete(ws.id);
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
	const wsLog = log.child({ wsId: ws.id, guildId: msg.guild_id });

	if (!guildRegistry.isRegistered(msg.guild_id)) {
		ws.send(
			JSON.stringify({
				type: "JOIN_ACK",
				guild_id: msg.guild_id,
				success: false,
				error: "Unknown guild — run /memeover setup in your Discord server first",
			} satisfies ServerMessage),
		);
		wsLog.warn({ event: "join_rejected", reason: "unknown_guild" }, "Join rejected: unknown guild");
		stats.joinRejected();
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
		wsLog.warn({ event: "join_rejected", reason: "invalid_token" }, "Join rejected: invalid token");
		stats.joinRejected();
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
	wsLog.info({ event: "join_success" }, "Client joined guild");
	stats.joinSuccess();
	broadcastMemberCount(msg.guild_id);
}

function handleLeave(ws: WSConnection, msg: LeaveMessage): void {
	store.leaveGuild(ws.id, msg.guild_id);
	log.child({ wsId: ws.id, guildId: msg.guild_id }).info({ event: "leave" }, "Client left guild");
	broadcastMemberCount(msg.guild_id);
}

// ─── Server factory ───────────────────────────────────────────────────────────

export function createServer() {
	return new Elysia()
		.get("/health", () => {
			const snapshot = stats.snapshot();
			return {
				status: "ok" as const,
				uptime: process.uptime(),
				connections: { active: snapshot.connections.active },
				guilds: { active: snapshot.guilds.active },
			};
		})
		.get("/metrics", (ctx) => {
			if (!metricsTokenBuf) {
				ctx.set.status = 403;
				return { error: "Forbidden" };
			}
			const auth = ctx.headers.authorization as string | undefined;
			const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
			const valid =
				token !== undefined &&
				token.length === metricsTokenBuf.length &&
				timingSafeEqual(Buffer.from(token), metricsTokenBuf);
			if (!valid) {
				ctx.set.status = 401;
				return { error: "Unauthorized" };
			}
			return stats.snapshot();
		})
		.ws("/ws", {
			maxPayloadLength: 4 * 1024, // 4 KB — JOIN/LEAVE/PONG never exceed ~500 bytes
			open(ws: WSConnection) {
				store.addClient(ws.id, ws);
				startHeartbeat(ws);
				stats.connectionOpened();
				log.info({ wsId: ws.id, event: "connected" }, "Client connected");
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
					stats.errorRateLimit();
					log.warn({ wsId: ws.id, event: "rate_limited" }, "Client rate limited");
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
					stats.errorParse();
					log.warn({ wsId: ws.id, event: "parse_error" }, "Invalid JSON from client");
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
					stats.errorValidation();
					log.warn(
						{ wsId: ws.id, event: "validation_error" },
						"Invalid message format from client",
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
				stats.connectionClosed();
				log.info({ wsId: ws.id, event: "disconnected" }, "Client disconnected");
				for (const guildId of guilds) {
					broadcastMemberCount(guildId);
				}
			},
		});
}
