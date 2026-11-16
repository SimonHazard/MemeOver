import { expect, test } from "bun:test";
import { DEFAULT_PUBLIC_WS_URL } from "@memeover/shared";
import { Redacted } from "effect";
import { loadConfig } from "./config";

const required = {
	DISCORD_TOKEN: "synthetic-discord-secret",
	DISCORD_CLIENT_ID: "123456789012345678",
};

for (const empty of [undefined, ""]) {
	test(`missing or empty optional values use defaults (${String(empty)})`, () => {
		const config = loadConfig({
			...required,
			WS_PORT: empty,
			PUBLIC_WS_URL: empty,
			LOGTAIL_TOKEN: empty,
			METRICS_TOKEN: empty,
		});
		expect(config.wsPort).toBe(3001);
		expect(config.publicWsUrl).toBe(DEFAULT_PUBLIC_WS_URL);
		expect(config.logtailToken).toBeUndefined();
		expect(config.metricsToken).toBeUndefined();
	});
	for (const key of ["DISCORD_TOKEN", "DISCORD_CLIENT_ID"]) {
		test(`required ${key} rejects ${String(empty)}`, () => {
			expect(() => loadConfig({ ...required, [key]: empty })).toThrow(
				`[Config] Missing required environment variable: ${key}`,
			);
		});
	}
}

for (const port of [1, 3001, 65535]) {
	test(`accepts integer port ${port}`, () => {
		expect(loadConfig({ ...required, WS_PORT: String(port) }).wsPort).toBe(port);
	});
}

for (const port of ["0", "65536", "abc", "3001x", "3001.5", "-1"]) {
	test(`rejects malformed or out-of-range port ${port}`, () => {
		expect(() => loadConfig({ ...required, WS_PORT: port })).toThrow(
			"[Config] WS_PORT must be a valid port number (1-65535)",
		);
	});
}

for (const url of ["ws://localhost:3001/ws", "wss://bot.example/ws"]) {
	test(`accepts the existing WebSocket URL prefix ${url}`, () => {
		expect(loadConfig({ ...required, PUBLIC_WS_URL: url }).publicWsUrl).toBe(url);
	});
}

test("invalid public URL retains a fixed prefix diagnostic", () => {
	expect(() => loadConfig({ ...required, PUBLIC_WS_URL: "https://bot.example/ws" })).toThrow(
		"[Config] PUBLIC_WS_URL must start with ws:// or wss://",
	);
});

test("all tokens unwrap only explicitly and stay masked in string, JSON and inspection", () => {
	const secrets = {
		DISCORD_TOKEN: required.DISCORD_TOKEN,
		LOGTAIL_TOKEN: "synthetic-logtail-secret",
		METRICS_TOKEN: "synthetic-metrics-secret",
	};
	const config = loadConfig({ ...required, ...secrets });
	expect(Redacted.value(config.discordToken)).toBe(secrets.DISCORD_TOKEN);
	expect(config.logtailToken).toBeDefined();
	expect(config.metricsToken).toBeDefined();
	if (!config.logtailToken || !config.metricsToken) throw new Error("Expected optional tokens");
	expect(Redacted.value(config.logtailToken)).toBe(secrets.LOGTAIL_TOKEN);
	expect(Redacted.value(config.metricsToken)).toBe(secrets.METRICS_TOKEN);
	for (const token of [config.discordToken, config.logtailToken, config.metricsToken]) {
		const rendered = [String(token), JSON.stringify(token), Bun.inspect(token)].join(" ");
		expect(rendered).toContain("redacted");
		for (const secret of Object.values(secrets)) expect(rendered).not.toContain(secret);
	}
	for (const secret of Object.values(secrets)) {
		expect(JSON.stringify(config)).not.toContain(secret);
		expect(Bun.inspect(config)).not.toContain(secret);
	}
});

for (const invalid of [
	{ WS_PORT: "malformed-port-secret" },
	{ PUBLIC_WS_URL: "https://user:url-secret@bot.example/ws?token=secret" },
	{ DISCORD_CLIENT_ID: "" },
]) {
	test(`failure diagnostics do not expose supplied values (${Object.keys(invalid)[0]})`, () => {
		const env = {
			...required,
			LOGTAIL_TOKEN: "private-logtail-token",
			METRICS_TOKEN: "private-metrics-token",
			...invalid,
		};
		let failure: unknown;
		try {
			loadConfig(env);
		} catch (error) {
			failure = error;
		}
		expect(failure).toBeInstanceOf(Error);
		const rendered = [String(failure), JSON.stringify(failure), Bun.inspect(failure)].join(" ");
		for (const value of Object.values(env)) {
			if (value) expect(rendered).not.toContain(value);
		}
	});
}

test("explicit records cannot inherit a required variable from the ambient preload", () => {
	expect(process.env.DISCORD_TOKEN).toBeDefined();
	expect(() => loadConfig({ DISCORD_CLIENT_ID: required.DISCORD_CLIENT_ID })).toThrow(
		"[Config] Missing required environment variable: DISCORD_TOKEN",
	);
});
