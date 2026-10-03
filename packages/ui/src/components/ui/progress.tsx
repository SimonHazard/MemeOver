import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@memeover/ui/lib/utils";

function Progress({ className, ...props }: ProgressPrimitive.Root.Props) {
	return (
		<ProgressPrimitive.Root
			data-slot="progress"
			className={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", className)}
			{...props}
		>
			<ProgressPrimitive.Track data-slot="progress-track" className="size-full">
				<ProgressPrimitive.Indicator
					data-slot="progress-indicator"
					className="bg-primary h-full transition-[width] duration-200 ease-out"
				/>
			</ProgressPrimitive.Track>
		</ProgressPrimitive.Root>
	);
}

export { Progress };
