import { describe, expect, test } from "bun:test";
import {
	DISCORD_MESSAGE_CONTENT_INTENT_ERROR,
	isDisallowedIntentsError,
	normalizeBotLoginError,
} from "./discord-intents";

describe("Discord intent error helpers", () => {
	test("detects Discord disallowed intent login failures", () => {
		expect(isDisallowedIntentsError(new Error("Used disallowed intents"))).toBe(true);
		expect(isDisallowedIntentsError("Disallowed intent")).toBe(true);
		expect(isDisallowedIntentsError(new Error("Invalid token"))).toBe(false);
	});

	test("turns disallowed intent failures into an actionable startup error", () => {
		const error = normalizeBotLoginError(new Error("Used disallowed intents"));

		expect(error.name).toBe("DiscordDisallowedIntentsError");
		expect(error.message).toContain(DISCORD_MESSAGE_CONTENT_INTENT_ERROR);
		expect(error.message).toContain("Message Content Intent");
		expect(error.message).toContain("Privileged Gateway Intents");
		expect(error.message).toContain("Used disallowed intents");
	});

	test("keeps unrelated Error instances intact", () => {
		const original = new Error("Invalid token");

		expect(normalizeBotLoginError(original)).toBe(original);
		expect(normalizeBotLoginError("plain failure").message).toBe("plain failure");
	});
});
