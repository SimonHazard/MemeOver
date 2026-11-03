import { describe, expect, test } from "bun:test";
import {
	type AutoplayProbeResult,
	classifyAutoplayError,
	INITIAL_LIVENESS,
	type LivenessResult,
	MAX_LIVENESS_FAILURES,
	nextLiveness,
	resolveAutoplay,
	type SourceLiveness,
	sourcePreviewStatus,
} from "./source-environment";

describe("autoplay detection", () => {
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
		expect(await resolveAutoplay(allowed.probe)).toBe(true);
		expect(allowed.calls.count).toBe(1);

		const blocked = probing("blocked");
		expect(await resolveAutoplay(blocked.probe)).toBe(false);
		expect(blocked.calls.count).toBe(1);
	});

	test("an inconclusive probe is retried and can still be refused", async () => {
		const later = probing("inconclusive", "blocked");
		expect(await resolveAutoplay(later.probe)).toBe(false);
		expect(later.calls.count).toBe(2);
	});

	test("a probe that never concludes draws no preview aid", async () => {
		const never = probing();
		expect(await resolveAutoplay(never.probe, 3)).toBe(true);
		expect(never.calls.count).toBe(3);
	});
});

test("the preview pill maps socket states and keeps a revocation or rejection sticky", () => {
	expect(sourcePreviewStatus("connecting", null, false)).toBe("connecting");
	expect(sourcePreviewStatus("connected", null, false)).toBe("connected");
	expect(sourcePreviewStatus("disconnected", null, false)).toBe("reconnecting");
	expect(sourcePreviewStatus("error", null, false)).toBe("reconnecting");
	expect(sourcePreviewStatus("error", null, true)).toBe("rejected");
	expect(sourcePreviewStatus("error", "TOKEN_ROTATED", false)).toBe("revoked");
	expect(sourcePreviewStatus("disconnected", "GUILD_UNREGISTERED", false)).toBe("revoked");
});

describe("browser source liveness", () => {
	const failed: LivenessResult = { failed: true };
	const served = (session: string | null): LivenessResult => ({ failed: false, session });
	const run = (results: LivenessResult[], from: SourceLiveness = INITIAL_LIVENESS) =>
		results.reduce((state, result) => nextLiveness(state, result).state, from);
	const active = run([served("a")]);

	test("a verified answer activates the source", () => {
		expect(active).toEqual({ status: "active", session: "a", failures: 0 });
	});

	test("a transient failure neither stops nor counts after a success", () => {
		const blips = Array.from({ length: MAX_LIVENESS_FAILURES - 1 }, () => failed);
		expect(run(blips, active).status).toBe("active");
		expect(run([...blips, served("a"), ...blips], active).status).toBe("active");
	});

	test("consecutive failures stop the source", () => {
		const down = Array.from({ length: MAX_LIVENESS_FAILURES }, () => failed);
		expect(run(down, active).status).toBe("stopped");
		expect(run(down).status).toBe("stopped");
	});

	test("an answer without the instance header stops at once and never resumes", () => {
		const foreign = run([served(null)], active);
		expect(foreign.status).toBe("stopped");
		expect(nextLiveness(foreign, served(null))).toEqual({ state: foreign, reload: false });
		expect(nextLiveness(foreign, failed).reload).toBe(false);
	});

	test("a new instance reloads, and so does MemeOver coming back after a stop", () => {
		expect(nextLiveness(active, served("b")).reload).toBe(true);
		const stopped = run([served(null)], active);
		expect(nextLiveness(stopped, served("a")).reload).toBe(true);
		expect(nextLiveness(stopped, served("b")).reload).toBe(true);
	});
});
