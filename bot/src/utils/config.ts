export interface Config {
	discordToken: string;
	discordClientId: string;
	wsPort: number;
}

function requireEnv(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`[Config] Missing required environment variable: ${key}`);
	}
	return value;
}

function loadConfig(): Config {
	const discordToken = requireEnv("DISCORD_TOKEN");
	const discordClientId = requireEnv("DISCORD_CLIENT_ID");

	const rawPort = process.env.WS_PORT;
	const wsPort = rawPort ? parseInt(rawPort, 10) : 3001;
	if (Number.isNaN(wsPort) || wsPort < 1 || wsPort > 65535) {
		throw new Error(`[Config] WS_PORT must be a valid port number (1-65535)`);
	}

	return { discordToken, discordClientId, wsPort };
}

export const config: Config = loadConfig();
