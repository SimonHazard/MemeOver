import { describe, expect, test } from "bun:test";
import { classifyMessageSource, classifyReactionSource, sourceField } from "./source";

describe("Discord event source classification", () => {
	test("classifies ordinary user messages as user source", () => {
		expect(
			classifyMessageSource({
				applicationId: null,
				author: { bot: false },
				webhookId: null,
			}),
		).toBe("user");
	});

	test("classifies bot, app, and webhook messages as bot_app source", () => {
		expect(
			classifyMessageSource({
				applicationId: null,
				author: { bot: true },
				webhookId: null,
			}),
		).toBe("bot_app");
		expect(
			classifyMessageSource({
				applicationId: "123",
				author: { bot: false },
				webhookId: null,
			}),
		).toBe("bot_app");
		expect(
			classifyMessageSource({
				applicationId: null,
				author: { bot: false },
				webhookId: "456",
			}),
		).toBe("bot_app");
	});

	test("classifies reaction users and omits user source from payloads", () => {
		expect(classifyReactionSource({ bot: false })).toBe("user");
		expect(classifyReactionSource({ bot: true })).toBe("bot_app");
		expect(sourceField("user")).toEqual({});
		expect(sourceField("bot_app")).toEqual({ source: "bot_app" });
	});
});
