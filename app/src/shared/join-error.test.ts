import { expect, test } from "bun:test";
import { JOIN_ACK_ERRORS } from "@memeover/shared";
import en from "../i18n/locales/en.json";
import fr from "../i18n/locales/fr.json";
import { joinErrorKey } from "./join-error";

test("known bot join errors map to dedicated translations", () => {
	expect(joinErrorKey(JOIN_ACK_ERRORS.unknownGuild)).toBe("connection.joinUnknownGuild");
	expect(joinErrorKey(JOIN_ACK_ERRORS.invalidToken)).toBe("connection.joinInvalidToken");
});

test("missing or unknown bot texts never leak untranslated", () => {
	expect(joinErrorKey(null)).toBe("connection.error");
	expect(joinErrorKey("")).toBe("connection.error");
	expect(joinErrorKey("Some future English error")).toBe("connection.error");
});

test("every mapped key exists in the locales", () => {
	for (const error of Object.values(JOIN_ACK_ERRORS)) {
		const key = joinErrorKey(error).split(".");
		for (const locale of [en, fr]) {
			expect(
				key.reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], locale),
			).toBeString();
		}
	}
});
