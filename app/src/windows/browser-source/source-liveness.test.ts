import { describe, expect, test } from "bun:test";
import {
	INITIAL_LIVENESS,
	type LivenessResult,
	MAX_LIVENESS_FAILURES,
	nextLiveness,
	type SourceLiveness,
} from "./source-liveness";

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
