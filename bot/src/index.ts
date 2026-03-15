import { startBot } from "./bot";
import { registerCommands } from "./commands/commands";
import { createServer } from "./server";
import { config } from "./utils/config";
import { logger } from "./utils/logger";
import { guildRegistry } from "./utils/registry";
import { store } from "./utils/store";
import type { ServerMessage } from "./utils/types";

const log = logger.child({ module: "index" });

// 1. Config is loaded and validated on import (throws at startup if invalid)

// 2. Create the Elysia WebSocket server
const app = createServer();

// 3. Start listening
app.listen(config.wsPort, () => {
	log.info(
		{ event: "listening", port: config.wsPort },
		`WebSocket server running at ws://localhost:${config.wsPort}/ws`,
	);
});

// 4. Start the Discord bot, then register slash commands
startBot()
	.then(async () => {
		await registerCommands();
	})
	.catch((err: unknown) => {
		log.error({ event: "bot_start_failed", err }, "Failed to start Discord bot");
		process.exit(1);
	});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
	log.info({ event: "shutdown", signal }, `Received ${signal}, shutting down gracefully...`);

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

// ─── Unhandled errors ─────────────────────────────────────────────────────────

process.on("unhandledRejection", (reason) => {
	log.error({ event: "unhandled_rejection", err: reason }, "Unhandled promise rejection");
	process.exit(1);
});

process.on("uncaughtException", (err) => {
	log.error({ event: "uncaught_exception", err }, "Uncaught exception");
	process.exit(1);
});
