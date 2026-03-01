import { startBot } from "./bot";
import { registerCommands } from "./commands/commands";
import { createServer } from "./server";
import { config } from "./utils/config";
import { guildRegistry } from "./utils/registry";
import { store } from "./utils/store";
import type { ServerMessage } from "./utils/types";

// 1. Config is loaded and validated on import (throws at startup if invalid)

// 2. Create the Elysia WebSocket server
const app = createServer();

// 3. Start listening
app.listen(config.wsPort, () => {
	console.log(`[Server] WebSocket server running at ws://localhost:${config.wsPort}/ws`);
});

// 4. Start the Discord bot, then register slash commands
startBot()
	.then(async () => {
		console.log("[Bot] Discord bot ready");
		await registerCommands();
	})
	.catch((err: unknown) => {
		console.error("[Bot] Failed to start Discord bot:", err);
		process.exit(1);
	});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
	console.log(`[Server] Received ${signal}, shutting down gracefully...`);

	// Notify all connected clients and close their connections
	const shutdownPayload = JSON.stringify({
		type: "ERROR",
		code: "SERVER_SHUTDOWN",
		message: "Server is shutting down",
	} satisfies ServerMessage);

	for (const client of store.getAllClients()) {
		try {
			client.ws_ref.send(shutdownPayload);
			client.ws_ref.close();
		} catch {
			// Client already disconnected — ignore
		}
	}

	// Persist registry one last time
	guildRegistry.flush();

	await app.stop();
	process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
