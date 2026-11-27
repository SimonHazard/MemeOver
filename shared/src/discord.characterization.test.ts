import { expect, test } from "bun:test";
import { createDiscordInviteUrl } from "./discord";

// Characterization: pins the exact createDiscordInviteUrl result for snowflake
// boundaries and junk inputs. Expected values were captured from the
// implementation before the regex dedup and must stay identical after it.
const CASES: ReadonlyArray<readonly [string, string | null]> = [
	["1".repeat(16), null],
	["1".repeat(17), "1".repeat(17)],
	["1".repeat(20), "1".repeat(20)],
	["1".repeat(21), null],
	["abc", null],
	["", null],
	[" 123456789012345678 ", "123456789012345678"],
	["12345678901234567a", null],
];

for (const [clientId, expectedClientId] of CASES)
	test(`createDiscordInviteUrl(${JSON.stringify(clientId)})`, () => {
		const url = createDiscordInviteUrl(clientId);
		if (expectedClientId === null) expect(url).toBeNull();
		else expect(new URL(url ?? "").searchParams.get("client_id")).toBe(expectedClientId);
	});
