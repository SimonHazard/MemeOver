import pino from "pino";
import { config } from "./config";

function createLogger(): pino.Logger {
	// Development: pretty-print with colors
	if (process.env.NODE_ENV !== "production") {
		return pino({
			level: "debug",
			transport: {
				target: "pino-pretty",
				options: {
					colorize: true,
					translateTime: "SYS:standard",
					ignore: "pid,hostname",
				},
			},
		});
	}

	// Production + BetterStack: JSON stdout + Logtail transport in parallel
	if (config.logtailToken) {
		return pino({
			level: "info",
			transport: {
				targets: [
					{ target: "pino/file", options: { destination: 1 }, level: "info" },
					{
						target: "@logtail/pino",
						options: { sourceToken: config.logtailToken },
						level: "info",
					},
				],
			},
		});
	}

	// Production, no Logtail: plain JSON to stdout (most performant, no transport overhead)
	return pino({ level: "info" });
}

export const logger = createLogger();
