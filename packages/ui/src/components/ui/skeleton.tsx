import { cn } from "@memeover/ui/lib/utils";
import type * as React from "react";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton"
			className={cn("bg-accent motion-safe:animate-pulse rounded-md", className)}
			{...props}
		/>
	);
}

export { Skeleton };
