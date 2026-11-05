import type { Page } from "@playwright/test";

type Handler = (event: { event: string; id: number; payload: unknown }) => void;

export interface DesktopStubWindow {
	/** Every native call the page made. */
	desktopInvoked: { command: string; args: { key?: string; value?: unknown } }[];
	/** Delivers an event as if another window or Rust had emitted it. */
	desktopEmit: (event: string, payload?: unknown) => void;
}

/** Just enough of the native side for the real overlay.html: settings come from its store. */
export async function installDesktopStub(page: Page, settings: object) {
	await page.addInitScript((saved) => {
		const callbacks = new Map<number, Handler>();
		const listeners = new Map<string, number[]>();
		const invoked: DesktopStubWindow["desktopInvoked"] = [];
		let nextCallback = 1;
		Object.assign(window, {
			isTauri: true,
			desktopInvoked: invoked,
			desktopEmit: (event: string, payload?: unknown) => {
				for (const id of listeners.get(event) ?? []) {
					callbacks.get(id)?.({ event, id, payload });
				}
			},
			__TAURI_INTERNALS__: {
				metadata: {
					currentWindow: { label: "overlay" },
					currentWebview: { label: "overlay", windowLabel: "overlay" },
				},
				transformCallback: (callback: Handler) => {
					const id = nextCallback++;
					callbacks.set(id, callback);
					return id;
				},
				unregisterCallback: (id: number) => callbacks.delete(id),
				invoke: async (
					command: string,
					args: { key?: string; value?: unknown; event?: string; handler?: number },
				) => {
					invoked.push({ command, args });
					if (command === "plugin:store|load") return 1;
					if (command === "plugin:store|get") {
						return args.key === "settings" ? [saved, true] : [null, false];
					}
					if (command === "plugin:event|listen") {
						const event = String(args.event);
						listeners.set(event, [...(listeners.get(event) ?? []), Number(args.handler)]);
						return 1;
					}
					return null;
				},
			},
		});
	}, settings);
}
