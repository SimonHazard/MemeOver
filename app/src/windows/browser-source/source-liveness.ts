// Whether a loaded page should keep showing memes, from its checks of the local server.

/** Consecutive failed requests before stopping: one can be a network change or a busy machine. */
export const MAX_LIVENESS_FAILURES = 3;

export type SourceStatus = "checking" | "active" | "stopped";

export interface SourceLiveness {
	status: SourceStatus;
	/** Instance identifier of the app that served this page, once verified. */
	session: string | null;
	failures: number;
}

export const INITIAL_LIVENESS: SourceLiveness = { status: "checking", session: null, failures: 0 };

/** `failed`: no HTTP answer. `session`: the answer's instance header, null if absent or not OK. */
export type LivenessResult = { failed: true } | { failed: false; session: string | null };

/**
 * Decides from one check whether the source keeps running, stops or restarts. Only a
 * response carrying the instance header proves MemeOver is back, and it reloads the page
 * to discard whatever the stopped or previous session left behind.
 */
export function nextLiveness(
	state: SourceLiveness,
	result: LivenessResult,
): { state: SourceLiveness; reload: boolean } {
	if (result.failed) {
		const failures = state.failures + 1;
		return {
			state: {
				...state,
				failures,
				status: failures >= MAX_LIVENESS_FAILURES ? "stopped" : state.status,
			},
			reload: false,
		};
	}
	if (result.session === null) {
		return { state: { ...state, status: "stopped", failures: 0 }, reload: false };
	}
	if (state.status === "stopped" || (state.session !== null && state.session !== result.session)) {
		return { state, reload: true };
	}
	return { state: { status: "active", session: result.session, failures: 0 }, reload: false };
}
