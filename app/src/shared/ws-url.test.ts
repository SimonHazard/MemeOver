import { expect, test } from "bun:test";
import { SetupSchema } from "@/windows/settings/components/setup-form/schema";
import { isWebSocketUrl } from "./ws-url";

test("only parsable ws and wss URLs are accepted", () => {
	for (const url of [
		"ws://localhost:3001/ws",
		"wss://bot.example.test/ws",
		"wss://bot.example.test:443/a/path?query=value",
	]) {
		expect(isWebSocketUrl(url)).toBe(true);
	}
	for (const url of ["ws://", "wss://", "ws://bad host/ws", "https://bot.example.test", "", "ws"]) {
		expect(isWebSocketUrl(url)).toBe(false);
	}
});

test("the setup form rejects a WebSocket prefix without a parsable URL", () => {
	const result = SetupSchema.shape.wsUrl.safeParse("ws://");
	expect(result.success).toBe(false);
	if (!result.success) expect(result.error.issues[0]?.message).toBe("validation.wsUrl_invalid");
});
