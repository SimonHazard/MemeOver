import { listen } from "@tauri-apps/api/event";

/** Own late registrations too, including StrictMode remounts and page reloads. */
export function listenDevEvent<T>(
	name: string,
	onPayload: (payload: T) => void,
	onReady?: () => void | Promise<void>,
) {
	let disposed = false;
	let unlisten: (() => void) | undefined;
	const report = (error: unknown) => console.warn("[Dev overlay] Event subscription failed", error);
	void listen<T>(name, ({ payload }) => {
		if (!disposed) onPayload(payload);
	})
		.then((stop) => {
			if (disposed) return stop();
			unlisten = stop;
			return onReady?.();
		})
		.catch(report);
	const dispose = () => {
		if (disposed) return;
		disposed = true;
		window.removeEventListener("pagehide", dispose);
		if (unlisten) void Promise.resolve(unlisten()).catch(report);
	};
	window.addEventListener("pagehide", dispose);
	return dispose;
}
