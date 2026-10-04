import { TooltipProvider } from "@memeover/ui/components/ui/tooltip";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { isTauri } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";
import { routeTree } from "@/routeTree.gen";
import { requestSettingsClose } from "./settings-close";

// ─── Router ───────────────────────────────────────────────────────────────────

// createMemoryHistory — Tauri has no URL bar, navigation is in-memory
const memoryHistory = createMemoryHistory({ initialEntries: ["/"] });
const router = createRouter({ routeTree, history: memoryHistory });

// ─── Type registration (required for route type-safety) ────────────────────────────

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function SettingsApp() {
	useEffect(() => {
		if (!isTauri()) return;
		const win = getCurrentWindow();
		const unlisten = win.listen("settings-close-requested", () => {
			// Without this acknowledgement Rust hides the window itself after a short delay.
			void emit("settings-close-ack");
			void requestSettingsClose(() => win.hide());
		});
		return () => {
			void unlisten.then((stop) => stop());
		};
	}, []);
	return (
		<TooltipProvider>
			<RouterProvider router={router} />
		</TooltipProvider>
	);
}
