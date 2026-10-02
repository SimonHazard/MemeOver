import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DISCORD_TOKEN ??= "test-discord-token";
process.env.DISCORD_CLIENT_ID ??= "123456789012345678";
process.env.PUBLIC_WS_URL = "wss://test.example/ws";
const dataDir = mkdtempSync(join(tmpdir(), "memeover-test-"));
process.env.MEMEOVER_DATA_DIR = dataDir;
process.on("exit", () => rmSync(dataDir, { recursive: true, force: true }));

if (typeof globalThis.localStorage === "undefined") {
	const values = new Map<string, string>();
	globalThis.localStorage = {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => {
			values.set(key, String(value));
		},
		removeItem: (key) => {
			values.delete(key);
		},
		clear: () => values.clear(),
		key: (index) => [...values.keys()][index] ?? null,
		get length() {
			return values.size;
		},
	};
}
if (!globalThis.navigator.language) {
	Object.defineProperty(globalThis.navigator, "language", { value: "en-US", configurable: true });
}
