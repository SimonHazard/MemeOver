export type HoldState = "idle" | "holding" | "confirmed";
export type HoldEvent =
	| { type: "start"; repeat?: boolean }
	| { type: "cancel" }
	| { type: "complete" };
export function nextHoldState(state: HoldState, event: HoldEvent): HoldState {
	if (event.type === "cancel") return "idle";
	if (event.type === "start") return state === "idle" && !event.repeat ? "holding" : state;
	return state === "holding" ? "confirmed" : state;
}
