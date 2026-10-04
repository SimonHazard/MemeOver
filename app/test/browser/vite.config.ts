import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";
import appConfig from "../../vite.config.ts";

export default mergeConfig(appConfig, {
	build: {
		rolldownOptions: {
			input: {
				badge: fileURLToPath(new URL("./overlay.html", import.meta.url)),
				components: fileURLToPath(new URL("./components.html", import.meta.url)),
				settings: fileURLToPath(new URL("./settings.html", import.meta.url)),
			},
		},
	},
});
