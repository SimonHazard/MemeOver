export const DEV_OVERLAY_COMMAND = "dev-overlay-simulation-command";
export const DEV_OVERLAY_STATE = "dev-overlay-simulation-state";

export type SampleMedia = "image" | "text" | "none";
export interface OverlaySimulation {
	enabled: boolean;
	peers: number;
	media: SampleMedia;
}
export type SimulationCommand =
	| { type: "read" | "start" | "stop" | "join" | "leave" }
	| { type: "media"; media: SampleMedia };

export const INITIAL_SIMULATION: OverlaySimulation = {
	enabled: false,
	peers: 0,
	media: "image",
};

/** Ephemeral local state only: no credentials, persistence or bot messages. */
export function reduceSimulation(
	state: OverlaySimulation,
	command: SimulationCommand,
): OverlaySimulation {
	if (command.type === "read") return state;
	if (command.type === "start") return { ...INITIAL_SIMULATION, enabled: true };
	if (command.type === "stop") return INITIAL_SIMULATION;
	if (!state.enabled) return state;
	switch (command.type) {
		case "join":
			return { ...state, peers: state.peers + 1 };
		case "leave":
			return { ...state, peers: Math.max(0, state.peers - 1) };
		case "media":
			return { ...state, media: command.media };
	}
}
