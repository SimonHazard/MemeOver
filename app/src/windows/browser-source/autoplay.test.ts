import { describe, expect, test } from "bun:test";
import { type AutoplayProbeResult, classifyAutoplayError, resolveSourceMode } from "./autoplay";

describe("source mode detection", () => {
	const probing = (...results: AutoplayProbeResult[]) => {
		const calls = { count: 0 };
		const probe = async () => results[calls.count++] ?? "inconclusive";
		return { calls, probe };
	};

	test("only NotAllowedError counts as a refusal", () => {
		expect(classifyAutoplayError(new DOMException("Blocked", "NotAllowedError"))).toBe("blocked");
		expect(classifyAutoplayError(new Error("Autoplay probe timed out"))).toBe("inconclusive");
		expect(classifyAutoplayError(new DOMException("No codec", "NotSupportedError"))).toBe(
			"inconclusive",
		);
		expect(classifyAutoplayError(new DOMException("Interrupted", "AbortError"))).toBe(
			"inconclusive",
		);
		expect(classifyAutoplayError("NotAllowedError")).toBe("inconclusive");
	});

	test("a clear answer ends the detection at once", async () => {
		const allowed = probing("allowed");
		expect(await resolveSourceMode(allowed.probe)).toBe("stream");
		expect(allowed.calls.count).toBe(1);

		const blocked = probing("blocked");
		expect(await resolveSourceMode(blocked.probe)).toBe("preview");
		expect(blocked.calls.count).toBe(1);
	});

	test("an inconclusive probe is retried and can still be refused", async () => {
		const later = probing("inconclusive", "blocked");
		expect(await resolveSourceMode(later.probe)).toBe("preview");
		expect(later.calls.count).toBe(2);
	});

	test("a probe that never concludes draws nothing on stream", async () => {
		const never = probing();
		expect(await resolveSourceMode(never.probe, 3)).toBe("stream");
		expect(never.calls.count).toBe(3);
	});
});
