// A public client's refresh token is single-use. To avoid two windows spending the same one,
// only the OVERLAY window refreshes (plan 112). The settings window writes this store in exactly
// two cases: after a completed device flow, and on disconnect.
import { emit } from "@tauri-apps/api/event";
import { Store } from "@tauri-apps/plugin-store";
import { normalizeTwitchAuth, type TwitchAuth } from "./auth";

// The backend store is shared across windows. No JS account cache, and no disk reload that
// could overwrite a concurrent in-memory write. Per-session keys keep a late refresh from
// overwriting a new login; a tombstone keeps a late refresh from resurrecting a disconnect.
const sessions = new WeakMap<TwitchAuth, string>();
let mutations: Promise<unknown> = Promise.resolve();
function serialize<T>(action: () => Promise<T>): Promise<T> {
	const pending = mutations.then(action);
	mutations = pending.catch(() => undefined);
	return pending;
}
function openStore(): Promise<Store> {
	return Store.load("twitch.json", { autoSave: false });
}
async function active(store: Store, sessionId: string): Promise<boolean> {
	return (
		(await store.get("sessionId")) === sessionId &&
		(await store.get(`revoked:${sessionId}`)) !== true
	);
}
export async function loadTwitchAuth(): Promise<TwitchAuth | null> {
	const store = await openStore();
	const sessionId = await store.get<unknown>("sessionId");
	if (typeof sessionId !== "string" || !/^[a-f0-9-]{36}$/.test(sessionId)) return null;
	const auth = normalizeTwitchAuth(await store.get(`auth:${sessionId}`));
	if (!auth || !(await active(store, sessionId))) return null;
	sessions.set(auth, sessionId);
	return auth;
}

/** Passing the original loaded account replaces tokens only within that login session. */
export function saveTwitchAuth(
	auth: TwitchAuth,
	previousAuth?: TwitchAuth,
	signal?: AbortSignal,
): Promise<boolean> {
	return serialize(async () => {
		const store = await openStore();
		const oldSession = previousAuth ? undefined : await store.get<string>("sessionId");
		const sessionId = previousAuth ? sessions.get(previousAuth) : crypto.randomUUID();
		if (!sessionId || signal?.aborted || (previousAuth && !(await active(store, sessionId))))
			return false;
		await store.set(`auth:${sessionId}`, auth);
		if (!previousAuth) await store.set("sessionId", sessionId);
		await store.save();
		if (oldSession && oldSession !== sessionId) {
			await store.set(`revoked:${oldSession}`, true);
			await store.delete(`auth:${oldSession}`);
			await store.save();
		}
		sessions.set(auth, sessionId);
		if (signal?.aborted) {
			await store.set(`revoked:${sessionId}`, true);
			await store.save();
		}
		if (!(await active(store, sessionId))) {
			await store.delete(`auth:${sessionId}`);
			await store.save();
			return false;
		}
		await emit("twitch-auth-changed", { connected: true, login: auth.login });
		return true;
	});
}

/** Conditional invalidation never disconnects an account connected while validation ran. */
export function clearTwitchAuth(previousAuth?: TwitchAuth): Promise<boolean> {
	return serialize(async () => {
		const store = await openStore();
		const sessionId = previousAuth
			? sessions.get(previousAuth)
			: await store.get<string>("sessionId");
		if (sessionId) {
			// Never replace the marker here: another window may have connected a new account.
			await store.set(`revoked:${sessionId}`, true);
			await store.save();
			await store.delete(`auth:${sessionId}`);
			await store.save();
		}
		const current = await loadTwitchAuth();
		if (current) return false;
		await emit("twitch-auth-changed", { connected: false, login: null });
		return true;
	});
}
