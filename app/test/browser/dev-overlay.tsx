import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { MotionConfig } from "framer-motion";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import i18n from "../../src/i18n";
import { useAppStore } from "../../src/shared/store";
import { DEFAULT_SETTINGS } from "../../src/shared/types";
import { OverlayApp } from "../../src/windows/overlay/OverlayApp";
import "../../src/App.css";

if (import.meta.env.DEV) {
	const { default: OverlayTestControls } = await import("../../src/dev/overlay-test-controls");
	const { saveTheme } = await import("../../src/shared/theme");
	const language = new URLSearchParams(location.search).get("lang") === "fr" ? "fr" : "en";
	localStorage.setItem("lang", language);
	await i18n.changeLanguage(language);
	mockWindows("overlay");
	const listeners = new Map<string, Set<number>>();
	// The installed SDK mock removes args.id, while event.js sends args.eventId.
	// Keep StrictMode cleanup faithful to the native API instead of retaining dead callbacks.
	mockIPC((command, payload) => {
		const args = payload as { event: string; handler: number; eventId: number; payload: unknown };
		if (command === "plugin:event|listen") {
			const handlers = listeners.get(args.event) ?? new Set<number>();
			handlers.add(args.handler);
			listeners.set(args.event, handlers);
			return args.handler;
		}
		if (command === "plugin:event|unlisten") {
			listeners.get(args.event)?.delete(args.eventId);
			return null;
		}
		if (command === "plugin:event|emit") {
			const internals = (
				window as unknown as {
					__TAURI_INTERNALS__: { runCallback: (id: number, event: unknown) => void };
				}
			).__TAURI_INTERNALS__;
			for (const id of [...(listeners.get(args.event) ?? [])]) {
				internals.runCallback(id, { event: args.event, id, payload: args.payload });
			}
			return null;
		}
		if (command.startsWith("plugin:store|"))
			throw new Error("Simulation touched persistent storage");
		if (command.startsWith("server_creator_"))
			throw new Error("Simulation called the server creator");
		return null;
	});
	useAppStore.setState({ settings: { ...DEFAULT_SETTINGS, duration: 1 }, overlayHealth: "alive" });
	const root = document.getElementById("root");
	if (root)
		createRoot(root).render(
			<StrictMode>
				<MotionConfig reducedMotion="user">
					<div className="relative z-10 max-w-xl p-5">
						<OverlayTestControls />
						<div id="fixture-actions">
							<button
								type="button"
								onClick={() =>
									useAppStore.getState().updateSettings({ mediaSize: 70, mediaOpacity: 35 })
								}
							>
								Apply display settings
							</button>
							<button
								type="button"
								onClick={() =>
									useAppStore.getState().updateSettings({ connectionNotificationsEnabled: false })
								}
							>
								Disable notifications
							</button>
							<button type="button" onClick={() => saveTheme("dark")}>
								Use dark theme
							</button>
						</div>
					</div>
					<OverlayApp />
				</MotionConfig>
			</StrictMode>,
		);
}
