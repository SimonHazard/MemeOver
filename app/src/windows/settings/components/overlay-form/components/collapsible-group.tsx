import { cn } from "@memeover/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

interface CollapsibleGroupProps {
	label: string;
	defaultOpen?: boolean;
	children: ReactNode;
}

export function CollapsibleGroup({ label, defaultOpen = false, children }: CollapsibleGroupProps) {
	const [open, setOpen] = useState(defaultOpen);
	const contentId = useId();

	return (
		<div className="space-y-3">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				aria-controls={contentId}
				className="flex w-full items-center justify-between gap-2 rounded-md border border-foreground/20 bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/60"
			>
				<span className="font-display tracking-wide text-xs">{label}</span>
				<ChevronDown
					className={cn("h-4 w-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
				/>
			</button>
			{open && (
				<div id={contentId} className="space-y-4 pl-1">
					{children}
				</div>
			)}
		</div>
	);
}
