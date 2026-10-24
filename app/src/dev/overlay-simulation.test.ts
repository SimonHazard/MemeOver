import { expect, test } from "bun:test";
import { INITIAL_SIMULATION, reduceSimulation } from "./overlay-simulation";

test("starting and stopping reset transient simulation state", () => {
	const started = reduceSimulation(INITIAL_SIMULATION, { type: "start" });
	expect(started).toEqual({ enabled: true, peers: 0, media: "image" });
	const joined = reduceSimulation(started, { type: "join" });
	const text = reduceSimulation(joined, { type: "media", media: "text" });
	expect(text).toEqual({ enabled: true, peers: 1, media: "text" });
	expect(reduceSimulation(text, { type: "stop" })).toEqual(INITIAL_SIMULATION);
	expect(INITIAL_SIMULATION).toEqual({ enabled: false, peers: 0, media: "image" });
});

test("departures stop at zero and cannot absorb a later arrival", () => {
	let state = reduceSimulation(INITIAL_SIMULATION, { type: "start" });
	state = reduceSimulation(state, { type: "leave" });
	expect(state.peers).toBe(0);
	state = reduceSimulation(state, { type: "join" });
	state = reduceSimulation(state, { type: "leave" });
	state = reduceSimulation(state, { type: "join" });
	expect(state.peers).toBe(1);
});

test("inactive simulation ignores content and connection commands", () => {
	for (const command of [
		{ type: "join" },
		{ type: "leave" },
		{ type: "media", media: "text" },
	] as const) {
		expect(reduceSimulation(INITIAL_SIMULATION, command)).toBe(INITIAL_SIMULATION);
	}
	expect(reduceSimulation(INITIAL_SIMULATION, { type: "read" })).toBe(INITIAL_SIMULATION);
});
