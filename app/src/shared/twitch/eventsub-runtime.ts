import { hasRequiredScopes, type TwitchAuth, tokenDecision } from "./auth";
import { INITIAL_SESSION, isSilent, onSessionMessage, type SessionState } from "./eventsub-session";
import { createSubscription, subscriptionRequests } from "./helix";
import { refreshTokens, validateToken } from "./oauth";
import { sessionOutcome, type TwitchStatus } from "./status";

export interface TwitchRuntimeDependencies {
	fetch: typeof fetch;
	clientId: string;
	createSocket: (url: string) => WebSocket;
	loadAuth: () => Promise<TwitchAuth | null>;
	saveAuth: (auth: TwitchAuth, previous: TwitchAuth) => Promise<boolean>;
	clearAuth: (previous: TwitchAuth) => Promise<boolean>;
	onStatus: (status: TwitchStatus) => void;
	onAccountCleared: () => void;
	onNotification: (type: string, event: unknown) => void;
	now?: () => number;
	later?: (callback: () => void, delay: number) => () => void;
	every?: (callback: () => void, delay: number) => () => void;
	reconnectDelay: (attempt: number) => number;
}

interface SocketSession {
	socket: WebSocket;
	state: SessionState;
	generation: number;
}

// StrictMode may mount a replacement before an old refresh finishes. Never spend a public
// client's single-use refresh token twice; finish saving a rotated pair even after disposal.
const refreshes = new Map<string, Promise<TwitchAuth | null>>();
function refreshOnce(
	auth: TwitchAuth,
	deps: TwitchRuntimeDependencies,
): Promise<TwitchAuth | null> {
	const existing = refreshes.get(auth.refreshToken);
	if (existing) return existing;
	const promise = (async () => {
		const result = await refreshTokens(deps, auth.refreshToken, (deps.now ?? Date.now)());
		if (result.status === "reauth_required") {
			await deps.clearAuth(auth);
			return null;
		}
		const updated = { ...auth, ...result.tokens };
		return (await deps.saveAuth(updated, auth)) ? updated : null;
	})();
	refreshes.set(auth.refreshToken, promise);
	void promise.finally(() => refreshes.delete(auth.refreshToken)).catch(() => {});
	return promise;
}

/** Owns only the desktop's EventSub session. No token crosses the notification/status boundary. */
export function startTwitchRuntime(deps: TwitchRuntimeDependencies) {
	const now = deps.now ?? Date.now;
	const later =
		deps.later ??
		((callback, delay) => {
			const timer = setTimeout(callback, delay);
			return () => clearTimeout(timer);
		});
	const every =
		deps.every ??
		((callback, delay) => {
			const timer = setInterval(callback, delay);
			return () => clearInterval(timer);
		});
	let disposed = false;
	let halted = false;
	let generation = 0;
	let auth: TwitchAuth | null = null;
	let current: SocketSession | null = null;
	let pending: SocketSession | null = null;
	let seenMessageIds: string[] = [];
	let retry: (() => void) | null = null;
	let attempt = 0;
	let retriedUnauthorized = false;
	let rotation: Promise<TwitchAuth | null> | null = null;
	let validation: Promise<void> | null = null;
	let authChangeVersion = 0;
	let lastStatus: TwitchStatus = "connecting";
	const requests = new Set<AbortController>();
	const live = (expected: number) => !disposed && !halted && expected === generation;
	const status = (value: TwitchStatus) => {
		lastStatus = value;
		if (!disposed) deps.onStatus(value);
	};

	function closeSession(session: SocketSession | null) {
		if (!session) return;
		session.socket.onopen = null;
		session.socket.onmessage = null;
		session.socket.onerror = null;
		session.socket.onclose = null;
		session.socket.close();
	}
	function disconnect() {
		generation++;
		closeSession(current);
		closeSession(pending);
		current = null;
		pending = null;
		for (const controller of requests) controller.abort();
		requests.clear();
	}
	async function request<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
		const controller = new AbortController();
		requests.add(controller);
		const cancel = later(() => controller.abort(), 8_000);
		try {
			return await operation(controller.signal);
		} finally {
			cancel();
			requests.delete(controller);
		}
	}
	async function reauth(previous: TwitchAuth | null) {
		if (disposed) return;
		halted = true;
		deps.onAccountCleared();
		disconnect();
		retry?.();
		retry = null;
		if (previous) await deps.clearAuth(previous);
		if (!disposed) status("reauth_required");
	}
	function retryConnection() {
		if (disposed || halted || retry) return;
		disconnect();
		status("connecting");
		retry = later(() => {
			retry = null;
			void connect();
		}, deps.reconnectDelay(attempt++));
	}
	async function rotate(previous: TwitchAuth): Promise<TwitchAuth | null> {
		rotation ??= refreshOnce(previous, deps);
		try {
			const updated = await rotation;
			if (!disposed) auth = updated;
			return updated;
		} finally {
			rotation = null;
		}
	}
	async function prepare(forceRefresh: boolean, expected: number): Promise<TwitchAuth | null> {
		let candidate = auth ?? (await deps.loadAuth());
		if (!live(expected)) return null;
		if (!candidate) {
			status("signed_out");
			return null;
		}
		auth = candidate;
		let refreshed = false;
		if (forceRefresh || tokenDecision(candidate, now()) === "refresh") {
			candidate = await rotate(candidate);
			refreshed = true;
			if (!live(expected)) return null;
			if (!candidate) {
				await reauth(auth);
				return null;
			}
		}
		let accessToken = candidate.accessToken;
		let result = await request((signal) => validateToken({ ...deps, signal }, accessToken));
		if (!live(expected)) return null;
		if (result.status === "invalid" && !refreshed) {
			candidate = await rotate(candidate);
			if (!live(expected)) return null;
			if (!candidate) {
				await reauth(auth);
				return null;
			}
			accessToken = candidate.accessToken;
			result = await request((signal) => validateToken({ ...deps, signal }, accessToken));
			if (!live(expected)) return null;
		}
		if (
			result.status !== "valid" ||
			result.userId !== candidate.userId ||
			!hasRequiredScopes(result)
		) {
			await reauth(candidate);
			return null;
		}
		auth = candidate;
		return candidate;
	}
	async function subscribe(session: SocketSession, sessionId: string) {
		const candidate = auth;
		if (!candidate) return;
		try {
			const results = await Promise.all(
				subscriptionRequests(candidate.userId).map(
					async (subscription) =>
						[
							subscription.type,
							await request((signal) =>
								createSubscription(
									{ ...deps, accessToken: candidate.accessToken, signal },
									{ ...subscription, sessionId },
								),
							),
						] as const,
				),
			);
			if (!live(session.generation) || current !== session) return;
			const outcome = sessionOutcome(Object.fromEntries(results));
			if (outcome === "unauthorized") {
				if (retriedUnauthorized) {
					await reauth(candidate);
					return;
				}
				retriedUnauthorized = true;
				disconnect();
				void connect(true);
				return;
			}
			if (outcome === "error") {
				retryConnection();
				return;
			}
			retriedUnauthorized = false;
			attempt = 0;
			status(outcome);
		} catch {
			if (live(session.generation)) retryConnection();
		}
	}
	function open(url: string, resumed: boolean) {
		const socket = deps.createSocket(url);
		const session: SocketSession = {
			socket,
			generation,
			state: { ...INITIAL_SESSION, resumed, lastMessageAt: now(), seenMessageIds },
		};
		if (resumed) pending = session;
		else current = session;
		socket.onmessage = (event: MessageEvent<string>) => {
			if (!live(session.generation) || typeof event.data !== "string") return;
			const previousId = session.state.sessionId;
			const result = onSessionMessage({ ...session.state, seenMessageIds }, event.data, now());
			session.state = result.state;
			seenMessageIds = result.state.seenMessageIds;
			if (pending === session && !previousId && result.state.sessionId) {
				const old = current;
				current = session;
				pending = null;
				closeSession(old);
				attempt = 0;
			}
			switch (result.effect.kind) {
				case "subscribe":
					void subscribe(session, result.effect.sessionId);
					break;
				case "notification":
					deps.onNotification(result.effect.type, result.effect.event);
					break;
				case "reconnect":
					if (!pending) {
						try {
							open(result.effect.url, true);
						} catch {
							retryConnection();
						}
					}
					break;
				case "revoked":
					if (["authorization_revoked", "user_removed"].includes(result.effect.status))
						void reauth(auth).catch(() => status("error"));
					else {
						halted = true;
						disconnect();
						status("error");
					}
					break;
			}
		};
		socket.onerror = socket.onclose = () => {
			if (live(session.generation)) retryConnection();
		};
	}
	async function connect(forceRefresh = false) {
		if (disposed || halted) return;
		const expected = generation;
		status("connecting");
		try {
			const candidate = await prepare(forceRefresh, expected);
			if (!candidate || !live(expected)) return;
			open("wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30", false);
		} catch {
			if (live(expected)) retryConnection();
		}
	}
	const stopWatchdog = every(() => {
		if (current && isSilent(current.state, now())) retryConnection();
		else if (pending && now() - pending.state.lastMessageAt > 25_000) retryConnection();
	}, 5_000);
	const stopValidation = every(
		() => {
			if (disposed || halted || !auth || !current || validation) return;
			const expected = generation;
			const previous = auth;
			validation = (async () => {
				try {
					const candidate = await prepare(false, expected);
					if (candidate && live(expected) && candidate.accessToken !== previous.accessToken) {
						disconnect();
						void connect();
					}
				} catch {
					if (live(expected)) retryConnection();
				}
			})().finally(() => {
				validation = null;
			});
		},
		60 * 60 * 1000,
	);
	void connect();
	return {
		requestStatus() {
			if (!disposed) deps.onStatus(lastStatus);
		},
		async authChanged() {
			const change = ++authChangeVersion;
			let loaded = await deps.loadAuth();
			if (disposed || change !== authChangeVersion) return;
			// Disconnect takes effect immediately, even while a token rotation is still in flight.
			if (!loaded) {
				deps.onAccountCleared();
				disconnect();
				retry?.();
				retry = null;
				auth = null;
				halted = true;
				status("signed_out");
				return;
			}
			if (rotation) await rotation.catch(() => {});
			if (disposed || change !== authChangeVersion) return;
			loaded = await deps.loadAuth();
			if (disposed || change !== authChangeVersion) return;
			if (loaded?.accessToken === auth?.accessToken && loaded?.userId === auth?.userId) return;
			disconnect();
			retry?.();
			retry = null;
			if (auth && auth.userId !== loaded?.userId) deps.onAccountCleared();
			auth = loaded;
			halted = false;
			retriedUnauthorized = false;
			if (loaded) void connect();
			else status("signed_out");
		},
		stop() {
			disposed = true;
			retry?.();
			retry = null;
			stopWatchdog();
			stopValidation();
			disconnect();
		},
	};
}
