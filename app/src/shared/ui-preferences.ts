import { isTauri } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";

export const UI_PREFERENCE_EVENT = "ui-preference-changed";

type Preference = { key: "theme"; value: "light" | "dark" } | { key: "lang"; value: "en" | "fr" };
type NativePreference = Preference & { source: string; revision: number };
const source = crypto.randomUUID();
let revision = 0;

function isPreference(value: unknown): value is Preference {
	if (!value || typeof value !== "object") return false;
	const preference = value as Record<string, unknown>;
	return (
		(preference.key === "theme" && (preference.value === "light" || preference.value === "dark")) ||
		(preference.key === "lang" && (preference.value === "en" || preference.value === "fr"))
	);
}

function isNativePreference(value: unknown): value is NativePreference {
	if (!isPreference(value)) return false;
	const message = value as Partial<NativePreference>;
	return (
		typeof message.source === "string" &&
		Number.isSafeInteger(message.revision) &&
		typeof message.revision === "number" &&
		message.revision > 0
	);
}

/** Persist first, then notify this document and the other application windows. */
export function saveUiPreference(preference: Preference) {
	localStorage.setItem(preference.key, preference.value);
	window.dispatchEvent(new CustomEvent(UI_PREFERENCE_EVENT, { detail: preference }));
	if (isTauri()) {
		void emit(UI_PREFERENCE_EVENT, { ...preference, source, revision: ++revision }).catch((error) =>
			console.warn("[Preferences] Could not broadcast preference", error),
		);
	}
}

/** Each subscription owns its cleanup, including a native listen that resolves after disposal. */
export function subscribeUiPreference(key: Preference["key"], onChange: () => void) {
	let disposed = false;
	let suspended = false;
	let nativeActive = false;
	let generation = 0;
	let unlisten: (() => void) | undefined;
	const received = new Map<string, number>();
	const notify = () => {
		if (!disposed && !suspended) onChange();
	};
	const onStorage = (event: StorageEvent) => {
		if (event.storageArea === localStorage && (event.key === key || event.key === null)) notify();
	};
	const onLocal = (event: Event) => {
		const detail: unknown = (event as CustomEvent).detail;
		if (isPreference(detail) && detail.key === key) notify();
	};
	const reportNativeError = (error: unknown) =>
		console.warn("[Preferences] Could not update native subscription", error);
	const stopNative = () => {
		generation++;
		nativeActive = false;
		const stop = unlisten;
		unlisten = undefined;
		// Tauri's UnlistenFn is typed as void, but the installed implementation returns a promise.
		if (stop) void Promise.resolve(stop()).catch(reportNativeError);
	};
	const startNative = () => {
		if (disposed || suspended || nativeActive || !isTauri()) return;
		nativeActive = true;
		const current = ++generation;
		void listen<unknown>(UI_PREFERENCE_EVENT, ({ payload }) => {
			if (
				disposed ||
				current !== generation ||
				!isNativePreference(payload) ||
				payload.key !== key ||
				payload.source === source
			)
				return;
			if (payload.revision <= (received.get(payload.source) ?? 0)) return;
			received.set(payload.source, payload.revision);
			// Receiving never re-emits; ignore this document's echoes and older revisions.
			if (localStorage.getItem(key) !== payload.value) localStorage.setItem(key, payload.value);
			notify();
		})
			.then((stop) => {
				if (disposed || current !== generation) return stop();
				unlisten = stop;
				// Catch a persisted change made while the native subscription was pending.
				notify();
			})
			.catch((error) => {
				if (current === generation) nativeActive = false;
				reportNativeError(error);
			});
	};
	const onPageHide = () => {
		suspended = true;
		stopNative();
	};
	const onPageShow = (event: PageTransitionEvent) => {
		if (!event.persisted) return;
		suspended = false;
		startNative();
		notify();
	};
	window.addEventListener("storage", onStorage);
	window.addEventListener(UI_PREFERENCE_EVENT, onLocal);
	// Reload/navigation need cleanup even when React has no opportunity to unmount.
	window.addEventListener("pagehide", onPageHide);
	window.addEventListener("pageshow", onPageShow);
	startNative();
	return () => {
		if (disposed) return;
		disposed = true;
		window.removeEventListener("storage", onStorage);
		window.removeEventListener(UI_PREFERENCE_EVENT, onLocal);
		window.removeEventListener("pagehide", onPageHide);
		window.removeEventListener("pageshow", onPageShow);
		stopNative();
	};
}
