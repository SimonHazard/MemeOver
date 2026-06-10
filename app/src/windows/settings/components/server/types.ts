export type StepState = "done" | "active" | "idle";

export interface ServerStep {
	title: string;
	state: StepState;
}
