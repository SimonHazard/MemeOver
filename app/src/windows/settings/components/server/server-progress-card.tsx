import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { cn } from "@memeover/ui/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";
import type { ServerStep, StepState } from "./types";

function StepItem({ index, title, state }: { index: number; title: string; state: StepState }) {
	const Icon = state === "done" ? CheckCircle2 : Circle;

	return (
		<div
			className={cn(
				"flex items-center gap-2 rounded-lg border-2 px-3 py-2 font-text text-sm",
				state === "done" && "border-foreground bg-primary/10 text-foreground",
				state === "active" && "border-foreground bg-secondary/10 text-foreground",
				state === "idle" && "border-border text-muted-foreground",
			)}
		>
			<Icon className="size-4 shrink-0" aria-hidden="true" />
			<span className="font-display text-xs tracking-wide">{index}.</span>
			<span className="min-w-0 truncate">{title}</span>
		</div>
	);
}

export function ServerProgressCard({ title, steps }: { title: string; steps: ServerStep[] }) {
	return (
		<NbCard>
			<div className="flex flex-col gap-3">
				<h2 className="font-display text-sm tracking-wide">{title}</h2>
				{steps.map((step, index) => (
					<StepItem key={step.title} index={index + 1} title={step.title} state={step.state} />
				))}
			</div>
		</NbCard>
	);
}
