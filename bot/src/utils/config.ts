import { DEFAULT_PUBLIC_WS_URL } from "@memeover/shared";
import { Config, ConfigProvider, Effect, Exit, Option, Redacted } from "effect";

export interface BotConfig {
	discordToken: Redacted.Redacted<string>;
	discordClientId: string;
	wsPort: number;
	publicWsUrl: string;
	logtailToken: Redacted.Redacted<string> | undefined;
	metricsToken: Redacted.Redacted<string> | undefined;
}

const fields = {
	discordToken: Config.NonEmptyString("DISCORD_TOKEN").pipe(Config.map(Redacted.make)),
	discordClientId: Config.NonEmptyString("DISCORD_CLIENT_ID"),
	wsPort: Config.Port("WS_PORT").pipe(Config.withDefault(3001)),
	publicWsUrl: Config.String("PUBLIC_WS_URL").pipe(Config.withDefault(DEFAULT_PUBLIC_WS_URL)),
	logtailToken: Config.NonEmptyString("LOGTAIL_TOKEN").pipe(
		Config.map(Redacted.make),
		Config.option,
		Config.map(Option.getOrUndefined),
	),
	metricsToken: Config.NonEmptyString("METRICS_TOKEN").pipe(
		Config.map(Redacted.make),
		Config.option,
		Config.map(Option.getOrUndefined),
	),
};

const schema = Config.all(fields);
const diagnostics: Record<keyof BotConfig, string> = {
	discordToken: "Missing required environment variable: DISCORD_TOKEN",
	discordClientId: "Missing required environment variable: DISCORD_CLIENT_ID",
	wsPort: "WS_PORT must be a valid port number (1-65535)",
	publicWsUrl: "PUBLIC_WS_URL must start with ws:// or wss://",
	logtailToken: "Invalid environment variable: LOGTAIL_TOKEN",
	metricsToken: "Invalid environment variable: METRICS_TOKEN",
};

export function loadConfig(env: Record<string, string | undefined> = process.env): BotConfig {
	const provider = ConfigProvider.fromEnvRecord(env);
	const result = Effect.runSyncExit(schema.parse(provider));
	if (Exit.isFailure(result)) {
		// Locate the failing key without rendering ConfigError/Cause, which may contain raw input.
		for (const key of Object.keys(fields) as (keyof BotConfig)[]) {
			const field: Config.Config<unknown> = fields[key];
			if (Exit.isFailure(Effect.runSyncExit(field.parse(provider)))) {
				throw new Error(`[Config] ${diagnostics[key]}`);
			}
		}
		throw new Error("[Config] Invalid environment configuration");
	}

	const { publicWsUrl } = result.value;
	if (!publicWsUrl.startsWith("ws://") && !publicWsUrl.startsWith("wss://")) {
		throw new Error("[Config] PUBLIC_WS_URL must start with ws:// or wss://");
	}

	return result.value;
}

export const config: BotConfig = loadConfig();
