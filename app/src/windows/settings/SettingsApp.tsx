import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";

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
	return <RouterProvider router={router} />;
}
