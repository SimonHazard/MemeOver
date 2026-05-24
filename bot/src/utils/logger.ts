import pino from "pino";
import { config } from "./config";

const privacyRedact: pino.LoggerOptions["redact"] = {
	paths: [
		"authorization",
		"*.authorization",
		"req.headers.authorization",
		"token",
		"*.token",
		"media_url",
		"*.media_url",
		"rawUrl",
		"*.rawUrl",
		"text",
		"*.text",
		"url",
		"*.url",
		"guildId",
		"*.guildId",
		"channelId",
		"*.channelId",
		"messageId",
		"*.messageId",
		"userId",
		"*.userId",
		"wsId",
		"*.wsId",
		"author_id",
		"*.author_id",
		"guild_id",
		"*.guild_id",
		"channel_id",
		"*.channel_id",
		"message_id",
		"*.message_id",
		"user_id",
		"*.user_id",
	],
	censor: "[redacted]",
};

function createLogger(): pino.Logger {
	// Development: pretty-print with colors
	if (process.env.NODE_ENV !== "production") {
		return pino({
			level: "debug",
			redact: privacyRedact,
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
			redact: privacyRedact,
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
	return pino({ level: "info", redact: privacyRedact });
}

export const logger = createLogger();
