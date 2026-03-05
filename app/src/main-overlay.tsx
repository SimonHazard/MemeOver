import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import React from "react";
import ReactDOM from "react-dom/client";
import { initOverlayStore } from "./shared/store";
import { OverlayApp } from "./windows/overlay/OverlayApp";
import "./App.css";

// Click-through in production only.
// In dev, the overlay is a normal 800×600 window — click-through
// would make it impossible to inspect / debug.
if (import.meta.env.PROD) {
	const win = getCurrentWebviewWindow();
	void win.setAlwaysOnTop(true);
	void invoke("set_overlay_click_through", { ignore: true });
}

// Load settings + subscribe to events, then show the window.
// (visible: false at startup → window invisible during loading)
void initOverlayStore().then(() => {
	void getCurrentWebviewWindow().show();
});

// Minimal QueryClient for the overlay — system queries (e.g. monitor detection)
// are stable for the session lifetime, so staleTime: Infinity is the right default.
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: Infinity,
			retry: false,
		},
	},
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<OverlayApp />
		</QueryClientProvider>
	</React.StrictMode>,
);
