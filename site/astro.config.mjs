import { defineConfig, fontProviders } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
	site: "https://memeover.simonhazard.com",
	output: "static",
	integrations: [react(), sitemap()],
	i18n: {
		locales: ["en", "fr"],
		defaultLocale: "en",
		routing: {
			prefixDefaultLocale: false,
		},
	},
	// Fonts API (stable in Astro 6 — moved out of experimental)
	fonts: [
		{
			// Maps to --font-display via var(--display-family) in theme.css @theme inline
			provider: fontProviders.google(),
			name: "Bungee",
			cssVariable: "--display-family",
			weights: [400],
			styles: ["normal"],
			fallbacks: ["system-ui"],
		},
		{
			// Maps to --font-sans / --font-text via var(--text-family) in theme.css @theme inline
			provider: fontProviders.google(),
			name: "Poppins",
			cssVariable: "--text-family",
			weights: [400, 500, 600, 700],
			styles: ["normal"],
			fallbacks: ["sans-serif"],
		},
	],
	vite: {
		plugins: [tailwindcss()],
		resolve: {
			alias: {
				"@memeover/ui": path.resolve("../packages/ui/src"),
			},
		},
	},
});
