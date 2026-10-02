import { DEFAULT_PUBLIC_WS_URL } from "@memeover/shared";

export interface Config {
	discordToken: string;
	discordClientId: string;
	wsPort: number;
	publicWsUrl: string;
	logtailToken: string | undefined;
	metricsToken: string | undefined;
}

function requireEnv(key: string, env: Record<string, string | undefined>): string {
	const value = env[key];
	if (!value) {
		throw new Error(`[Config] Missing required environment variable: ${key}`);
	}
	return value;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
	const discordToken = requireEnv("DISCORD_TOKEN", env);
	const discordClientId = requireEnv("DISCORD_CLIENT_ID", env);

	const rawPort = env.WS_PORT;
	const wsPort = rawPort ? parseInt(rawPort, 10) : 3001;
	if (Number.isNaN(wsPort) || wsPort < 1 || wsPort > 65535) {
		throw new Error(`[Config] WS_PORT must be a valid port number (1-65535)`);
	}

	const publicWsUrl = env.PUBLIC_WS_URL || DEFAULT_PUBLIC_WS_URL;
	if (!publicWsUrl.startsWith("ws://") && !publicWsUrl.startsWith("wss://")) {
		throw new Error("[Config] PUBLIC_WS_URL must start with ws:// or wss://");
	}

	const logtailToken = env.LOGTAIL_TOKEN || undefined;
	const metricsToken = env.METRICS_TOKEN || undefined;

	return { discordToken, discordClientId, wsPort, publicWsUrl, logtailToken, metricsToken };
}

export const config: Config = loadConfig();
