import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
	// prevent vite from obscuring rust errors
	clearScreen: false,
	// Tauri expects a fixed port, fail if that port is not available
	server: {
		// Tauri expects a fixed port, fail if that port is not available
		strictPort: true,
		// if the host Tauri is expecting is set, use it
		host: host || false,
		port: 5173,
	},
	// to access the Tauri environment variables set by the CLI with information about the current target
	envPrefix: [
		"VITE_",
		"TAURI_PLATFORM",
		"TAURI_ARCH",
		"TAURI_FAMILY",
		"TAURI_PLATFORM_VERSION",
		"TAURI_PLATFORM_TYPE",
		"TAURI_DEBUG",
	],
	build: {
		// Tauri uses Chromium on Windows and WebKit on macOS and Linux
		target: process.env.TAURI_PLATFORM === "windows" ? "chrome105" : "safari13",
		// don't minify for debug builds
		minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
		// produce sourcemaps for debug builds
		sourcemap: !!process.env.TAURI_DEBUG,
	},
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
