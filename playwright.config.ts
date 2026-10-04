import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./test/browser",
	fullyParallel: false,
	workers: 1,
	use: {
		baseURL: "http://127.0.0.1:1429",
		viewport: { width: 960, height: 800 },
		trace: "retain-on-failure",
	},
	projects: [
		{ name: "chrome", use: { browserName: "chromium", channel: "chrome" } },
		{ name: "webkit", use: { browserName: "webkit" } },
	],
	webServer: {
		command: "bun run --cwd app dev --host 127.0.0.1 --port 1429",
		url: "http://127.0.0.1:1429",
		reuseExistingServer: false,
	},
});
