import type { ServerMessage } from "@memeover/shared";
import { Effect } from "effect";
import { destroyDiscordClient, startBot } from "./bot";
import { registerCommands } from "./commands/commands";
import { createShutdownDeadline, lifecycleExitCode, runBot } from "./lifecycle";
import { BotRuntime } from "./runtime";
import { createServer } from "./server";
import { config } from "./utils/config";
import { rearmAllGuildPauses } from "./utils/guild-pause-timers";
import { logger } from "./utils/logger";
import { guildRegistry } from "./utils/registry";
import { store } from "./utils/store";

const log = logger.child({ module: "index" });

const deadline = createShutdownDeadline(() => {
	log.error({ event: "shutdown_timeout" }, "Graceful shutdown timed out");
	process.exit(1);
});

// The lifecycle owns BotRuntime, so it must run outside that runtime.
const lifecycle = Effect.runFork(
	runBot({
		listen: () => {
			const app = createServer();
			app.listen(config.wsPort, () => {
				log.info(
					{ event: "listening", port: config.wsPort },
					`WebSocket server running at ws://localhost:${config.wsPort}/ws`,
				);
			});
			return async () => {
				await app.stop();
			};
		},
		rearmPauses: rearmAllGuildPauses,
		loginDiscord: startBot,
		registerCommands,
		destroyDiscord: destroyDiscordClient,
		flushRegistry: () => guildRegistry.flush(),
		notifyClientsOfShutdown: () => {
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
		},
		disposeRuntime: () => BotRuntime.dispose(),
		beginShutdown: () => deadline.start(),
		logFailure: (event, err, message) => log.error({ event, err }, message),
	}),
);

lifecycle.addObserver((exit) => {
	deadline.clear();
	process.exit(lifecycleExitCode(exit));
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────

let shuttingDown = false;
function shutdown(signal: string): void {
	if (shuttingDown) return;
	shuttingDown = true;
	deadline.start();
	log.info({ event: "shutdown", signal }, `Received ${signal}, shutting down gracefully...`);
	lifecycle.interruptUnsafe();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ─── Unhandled errors ─────────────────────────────────────────────────────────

// Prefer a restart under restart: unless-stopped after an unhandled failure.
// Continuing with unknown state risks corrupting subsequent work.
process.on("unhandledRejection", (reason) => {
	log.error({ event: "unhandled_rejection", err: reason }, "Unhandled promise rejection");
	process.exit(1);
});

process.on("uncaughtException", (err) => {
	log.error({ event: "uncaught_exception", err }, "Uncaught exception");
	process.exit(1);
});
