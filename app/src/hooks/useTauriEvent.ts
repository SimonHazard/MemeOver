import { listen } from "@tauri-apps/api/event";
import { useCallback, useMemo, useSyncExternalStore } from "react";

// ─── Store shape ──────────────────────────────────────────────────────────────

interface TauriStore<T> {
	payload: T | undefined;
	version: number;
	subscribers: Set<() => void>;
	cleanup: (() => void) | null;
	refCount: number;
	/** Whether the Tauri listener is (or should be) active. Set to false on full cleanup. */
	active: boolean;
}

// ─── Module-level registry ────────────────────────────────────────────────────
// One shared store per event name across all components in the same window context.
// Avoids duplicate Tauri listeners when multiple components subscribe to the same event.

const registry = new Map<string, TauriStore<unknown>>();

function getOrCreateStore<T>(eventName: string): TauriStore<T> {
	if (!registry.has(eventName)) {
		registry.set(eventName, {
			payload: undefined,
			version: 0,
			subscribers: new Set(),
			cleanup: null,
			refCount: 0,
			active: false,
		});
	}
	return registry.get(eventName) as TauriStore<T>;
}

// ─── Subscribe factory ────────────────────────────────────────────────────────
// Returns a subscribe function suitable for useSyncExternalStore.
// Multiple component instances calling this for the same eventName all share
// the same underlying Tauri listener (reference-counted via refCount).

function createSubscribeFn(eventName: string) {
	return (onStoreChange: () => void): (() => void) => {
		const store = getOrCreateStore(eventName);
		store.subscribers.add(onStoreChange);
		store.refCount++;

		if (store.refCount === 1) {
			// First subscriber: start the Tauri event listener.
			// `store.active` prevents stale callbacks from updating a cleaned-up store
			// (handles React StrictMode double-invoke where cleanup fires before listen resolves).
			store.active = true;
			void listen(eventName, (event) => {
				if (!store.active) return;
				store.payload = event.payload as unknown;
				store.version++;
				for (const sub of store.subscribers) sub();
			}).then((unlisten) => {
				if (!store.active)
					unlisten(); // Too late — already cleaned up
				else store.cleanup = unlisten;
			});
		}

		return () => {
			store.subscribers.delete(onStoreChange);
			store.refCount--;
			if (store.refCount === 0) {
				store.active = false;
				store.cleanup?.();
				store.cleanup = null;
				// Purge the store so the next subscription creates a fresh one.
				registry.delete(eventName);
			}
		};
	};
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Subscribe to a Tauri event via `useSyncExternalStore`.
 * Returns the latest event payload (`undefined` until the first event fires).
 *
 * @example
 * const wsStatus = useTauriEvent<WsStatus>("ws-status-changed");
 */
export function useTauriEvent<T>(eventName: string): T | undefined {
	// useMemo gives a stable subscribe reference per (component, eventName).
	// All instances for the same eventName share the module-level store.
	const subscribe = useMemo(() => createSubscribeFn(eventName), [eventName]);
	const getSnapshot = useCallback(() => getOrCreateStore<T>(eventName).payload, [eventName]);

	return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}

/**
 * Subscribe to a Tauri event and return a monotonically increasing counter.
 * Use this as a TanStack Query key suffix to trigger automatic refetches without
 * any `useEffect` in the component.
 *
 * @example
 * const v = useTauriEventVersion("history-updated");
 * const { data } = useQuery({ queryKey: ["history", v], queryFn: loadHistory });
 */
export function useTauriEventVersion(eventName: string): number {
	const subscribe = useMemo(() => createSubscribeFn(eventName), [eventName]);
	const getSnapshot = useCallback(() => getOrCreateStore(eventName).version, [eventName]);

	return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
