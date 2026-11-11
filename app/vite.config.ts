import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { BROWSER_SOURCE_SESSION_HEADER } from "./src/shared/browser-source-contract.ts";

const host = process.env.TAURI_DEV_HOST;
const sourceSessionHeaders = { [BROWSER_SOURCE_SESSION_HEADER]: randomUUID() };

export default defineConfig({
	plugins: [
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
			routesDirectory: "./src/routes",
			generatedRouteTree: "./src/routeTree.gen.ts",
		}),
		react(),
		tailwindcss(),
	],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"@memeover/ui": fileURLToPath(new URL("../packages/ui/src", import.meta.url)),
		},
	},
	envPrefix: ["VITE_", "TAURI_ENV_"],
	// Keep Rust errors visible when the dev server refreshes.
	clearScreen: false,
	// Tauri expects a fixed port.
	server: {
		headers: sourceSessionHeaders,
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: "ws",
					host,
					port: 1421,
				}
			: undefined,
		watch: {
			ignored: ["**/src-tauri/**"],
		},
	},
	preview: { headers: sourceSessionHeaders },
	build: {
		rolldownOptions: {
			input: {
				main: fileURLToPath(new URL("./index.html", import.meta.url)),
				overlay: fileURLToPath(new URL("./overlay.html", import.meta.url)),
				"browser-source": fileURLToPath(new URL("./browser-source.html", import.meta.url)),
			},
		},
	},
});
