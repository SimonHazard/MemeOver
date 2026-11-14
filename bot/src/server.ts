import { timingSafeEqual } from "node:crypto";
import type { JoinMessage, LeaveMessage, ServerMessage } from "@memeover/shared";
import { ClientMessageSchema, JOIN_ACK_ERRORS, type SessionRevocationCode } from "@memeover/shared";
import { Effect, type ManagedRuntime, Redacted } from "effect";
import { Elysia } from "elysia";
import { BotRuntime } from "./runtime";
import { Heartbeats } from "./services/heartbeats";
import { config } from "./utils/config";
import { isDiscordGatewayUsable } from "./utils/discord-gateway";
import { SERVER_FEATURES } from "./utils/features";
import { isPausedAt } from "./utils/guild-pause";
import { discordRefLogFields } from "./utils/log-privacy";
import { logger } from "./utils/logger";
import { schedulePresenceRefresh } from "./utils/presence";
import { guildRegistry } from "./utils/registry";
import { stats } from "./utils/stats";
import { store } from "./utils/store";
import type { WSConnection } from "./utils/types";

const log = logger.child({ module: "server" });

const metricsTokenBuf = config.metricsToken
	? Buffer.from(Redacted.value(config.metricsToken))
	: null;

// ─── Broadcast ────────────────────────────────────────────────────────────────

/** Bun returns 0 for a dropped message; -1 means queued under backpressure. */
function delivered(ws: WSConnection, payload: string): boolean {
	try {
		return ws.send(payload) !== 0;
	} catch {
		return false;
	}
}

/** Sends MEMBER_COUNT_UPDATE to every socket in the guild with the distinct install count. */
function broadcastMemberCount(guildId: string): void {
	const memberIds = [...store.getGuildMembers(guildId)];
	const count = store.getGuildPresenceCount(guildId);
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

export function broadcastToGuild(guildId: string, event: ServerMessage): void {
	// Snapshot the Set before iterating — removeClient() mutates the live Set
	const memberIds = [...store.getGuildMembers(guildId)];
	const payload = JSON.stringify(event satisfies ServerMessage);

	for (const wsId of memberIds) {
		const client = store.getClient(wsId);
		if (!client) continue;

		if (!delivered(client.ws_ref, payload)) {
			log.warn(
				{ ...discordRefLogFields({ wsId }), event: "send_failed" },
				"Failed to send to client, removing",
			);
			dropClient(client.ws_ref);
		}
	}

	// Counts broadcast events (one per Discord message), not per-recipient sends
	stats.messageBroadcast();
}

/** Remove membership synchronously before notifying or closing revoked clients. */
export function evictGuild(
	guildId: string,
	code: SessionRevocationCode,
	message: string,
	closeReason = "Session revoked",
): number {
	let evicted = 0;
	for (const wsId of [...store.getGuildMembers(guildId)]) {
		const client = store.getClient(wsId);
		store.leaveGuild(wsId, guildId);
		if (!client) continue;
		evicted++;
		try {
			client.ws_ref.send(JSON.stringify({ type: "ERROR", code, message } satisfies ServerMessage));
		} catch (err) {
			log.warn(
				{ ...discordRefLogFields({ guildId, wsId }), event: "guild_eviction_send_failed", err },
				"Failed to notify revoked client",
			);
		}
		if (client.joined_guilds.size === 0) {
			try {
				client.ws_ref.close(1008, closeReason);
			} catch (err) {
				log.warn(
					{ ...discordRefLogFields({ guildId, wsId }), event: "guild_eviction_close_failed", err },
					"Failed to close revoked client",
				);
			}
		}
	}
	log.info(
		{ ...discordRefLogFields({ guildId }), event: "guild_evicted", code, evicted },
		"Guild sessions revoked",
	);
	return evicted;
}

// ─── Rate limiting ─────────────────────────────────────────────────────────────

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 1_000;

interface RateLimitState {
	count: number;
	resetAt: number;
}

const rateLimiters = new Map<string, RateLimitState>();

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

const PING_PAYLOAD = JSON.stringify({ type: "PING" } satisfies ServerMessage);
const heartbeatStops = new Map<string, () => void>();

function clearHeartbeat(wsId: string): void {
	const stop = heartbeatStops.get(wsId);
	heartbeatStops.delete(wsId);
	stop?.();
}

/** Activity only feeds inactivity cleanup: losing one update must not break session cleanup. */
function recordGuildActivitySafely(guildId: string): void {
	try {
		guildRegistry.recordGuildActivity(guildId);
	} catch (err) {
		log.error(
			{ ...discordRefLogFields({ guildId }), event: "activity_write_failed", err },
			"Could not record guild activity",
		);
	}
}

function removeClientSession(wsId: string): void {
	clearHeartbeat(wsId);
	rateLimiters.delete(wsId);
	const client = store.getClient(wsId);
	if (!client) return;
	const guilds = [...client.joined_guilds];
	store.removeClient(wsId);
	for (const guildId of guilds) {
		recordGuildActivitySafely(guildId);
	}
	for (const guildId of guilds) {
		broadcastMemberCount(guildId);
	}
	schedulePresenceRefresh();
}

/**
 * Removes the session and closes the transport. A socket left open without
 * membership or heartbeat would look connected to the overlay while receiving nothing;
 * closing it lets the app reconnect.
 */
function dropClient(ws: WSConnection): void {
	removeClientSession(ws.id);
	try {
		ws.close();
	} catch {
		// Already closed
	}
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

function sendGuildState(ws: WSConnection, guildId: string): void {
	const cfg = guildRegistry.getConfig(guildId);
	ws.send(
		JSON.stringify({
			type: "GUILD_STATE",
			guild_id: guildId,
			paused_until: isPausedAt(cfg, Date.now()) ? (cfg?.paused_until ?? null) : null,
		} satisfies ServerMessage),
	);
}

function handleJoin(ws: WSConnection, msg: JoinMessage): void {
	const wsLog = log.child(discordRefLogFields({ wsId: ws.id, guildId: msg.guild_id }));

	if (!guildRegistry.isRegistered(msg.guild_id)) {
		ws.send(
			JSON.stringify({
				type: "JOIN_ACK",
				guild_id: msg.guild_id,
				success: false,
				error: JOIN_ACK_ERRORS.unknownGuild,
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
				error: JOIN_ACK_ERRORS.invalidToken,
			} satisfies ServerMessage),
		);
		wsLog.warn({ event: "join_rejected", reason: "invalid_token" }, "Join rejected: invalid token");
		stats.joinRejected();
		return;
	}

	guildRegistry.recordClientActivity(msg.guild_id, msg.client_id ?? ws.id);

	// Idempotent: already joined → just ACK
	if (store.isClientInGuild(ws.id, msg.guild_id)) {
		ws.send(
			JSON.stringify({
				type: "JOIN_ACK",
				guild_id: msg.guild_id,
				success: true,
				features: [...SERVER_FEATURES],
			} satisfies ServerMessage),
		);
		sendGuildState(ws, msg.guild_id);
		return;
	}

	store.joinGuild(ws.id, msg.guild_id);
	store.setClientId(ws.id, msg.client_id);
	ws.send(
		JSON.stringify({
			type: "JOIN_ACK",
			guild_id: msg.guild_id,
			success: true,
			features: [...SERVER_FEATURES],
		} satisfies ServerMessage),
	);
	sendGuildState(ws, msg.guild_id);
	wsLog.info({ event: "join_success" }, "Client joined guild");
	stats.joinSuccess();
	broadcastMemberCount(msg.guild_id);
	schedulePresenceRefresh();
}

function handleLeave(ws: WSConnection, msg: LeaveMessage): void {
	// LEAVE carries no token: only a socket admitted by JOIN may touch the guild's
	// retention timestamp, member count and presence.
	if (!store.isClientInGuild(ws.id, msg.guild_id)) return;
	store.leaveGuild(ws.id, msg.guild_id);
	recordGuildActivitySafely(msg.guild_id);
	log
		.child(discordRefLogFields({ wsId: ws.id, guildId: msg.guild_id }))
		.info({ event: "leave" }, "Client left guild");
	broadcastMemberCount(msg.guild_id);
	schedulePresenceRefresh();
}

// ─── Server factory ───────────────────────────────────────────────────────────

export function createServer(
	heartbeatRuntime: Pick<ManagedRuntime.ManagedRuntime<Heartbeats, never>, "runSync"> = BotRuntime,
) {
	const runHeartbeat = (effect: Effect.Effect<void, never, Heartbeats>) =>
		heartbeatRuntime.runSync(effect);
	return new Elysia()
		.get("/health", (ctx) => {
			const snapshot = stats.snapshot();
			const discordUsable = isDiscordGatewayUsable();
			if (!discordUsable) ctx.set.status = 503;
			return {
				status: discordUsable ? ("ok" as const) : ("discord_unavailable" as const),
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
				heartbeatStops.set(ws.id, () =>
					runHeartbeat(Effect.flatMap(Heartbeats, (heartbeats) => heartbeats.stop(ws.id))),
				);
				runHeartbeat(
					Effect.flatMap(Heartbeats, (heartbeats) =>
						heartbeats.start({
							id: ws.id,
							sendPing: () => delivered(ws, PING_PAYLOAD),
							onSendFailure: () => dropClient(ws),
							onTimeout: () => {
								log.warn(
									{ ...discordRefLogFields({ wsId: ws.id }), event: "heartbeat_timeout" },
									"Client missed PONG, closing connection",
								);
								stats.errorHeartbeatTimeout();
								dropClient(ws);
							},
						}),
					),
				);
				stats.connectionOpened();
				log.info(
					{ ...discordRefLogFields({ wsId: ws.id }), event: "connected" },
					"Client connected",
				);
			},

			message(ws: WSConnection, raw: unknown) {
				if (!checkRateLimit(ws.id)) {
					ws.send(
						JSON.stringify({
							type: "ERROR",
							code: "RATE_LIMITED",
							message: "Too many messages — max 5 per second",
						} satisfies ServerMessage),
					);
					stats.errorRateLimit();
					log.warn(
						{ ...discordRefLogFields({ wsId: ws.id }), event: "rate_limited" },
						"Client rate limited",
					);
					return;
				}

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
					log.warn(
						{ ...discordRefLogFields({ wsId: ws.id }), event: "parse_error" },
						"Invalid JSON from client",
					);
					return;
				}

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
						{ ...discordRefLogFields({ wsId: ws.id }), event: "validation_error" },
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
						runHeartbeat(Effect.flatMap(Heartbeats, (heartbeats) => heartbeats.pong(ws.id)));
						break;
					}
					default: {
						const _: never = msg;
						void _;
					}
				}
			},

			close(ws: WSConnection) {
				removeClientSession(ws.id);
				stats.connectionClosed();
				log.info(
					{ ...discordRefLogFields({ wsId: ws.id }), event: "disconnected" },
					"Client disconnected",
				);
			},
		});
}
