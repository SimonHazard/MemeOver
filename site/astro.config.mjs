import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

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
				"@": fileURLToPath(new URL("./src", import.meta.url)),
				"@memeover/ui": fileURLToPath(new URL("../packages/ui/src", import.meta.url)),
			},
		},
	},
});
