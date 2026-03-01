import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { useAppStore } from "@/shared/store";

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

// ─── WS error redirect — outside React, no useEffect ─────────────────────────
// Zustand without subscribeWithSelector → 2-arg form (state, prevState)

useAppStore.subscribe((state, prevState) => {
	if (state.wsStatus === "error" && prevState.wsStatus !== "error") {
		void router.navigate({ to: "/" });
	}
});

// ─── Root ─────────────────────────────────────────────────────────────────────

export function SettingsApp() {
	return <RouterProvider router={router} />;
}
