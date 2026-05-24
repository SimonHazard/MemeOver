import { defineConfig } from "astro/config";
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
	vite: {
		plugins: [tailwindcss()],
		resolve: {
			alias: {
				"@memeover/ui": path.resolve("../packages/ui/src"),
			},
		},
	},
});
