import type * as React from "react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@memeover/ui/components/ui/accordion";
import { NB_SHADOW_SM } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";

// ─── NbAccordion — Neo-brutalist accordion ───────────────────────────────────
// Each item is a mini-card: 2px border + 2px offset shadow.
// Trigger uses font-display; primary tint signals open state.

function NbAccordion({ className, ...props }: React.ComponentProps<typeof Accordion>) {
	return <Accordion className={cn("space-y-2", className)} {...props} />;
}

function NbAccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionItem>) {
	return (
		<AccordionItem
			className={cn(
				"border-2 border-foreground rounded-md bg-card overflow-hidden",
				NB_SHADOW_SM,
				"last:border-b-2",
				"data-[state=open]:bg-primary-400/10",
				"transition-colors",
				className,
			)}
			{...props}
		/>
	);
}

function NbAccordionTrigger({
	className,
	children,
	...props
}: React.ComponentProps<typeof AccordionTrigger>) {
	return (
		<AccordionTrigger
			className={cn(
				"px-3 py-2.5 font-display tracking-wide text-xs text-foreground rounded-none",
				"hover:no-underline hover:bg-primary-400/15",
				"data-[state=open]:border-b-2 data-[state=open]:border-foreground",
				"[&>svg]:text-foreground [&>svg]:translate-y-0",
				"transition-colors",
				className,
			)}
			{...props}
		>
			{children}
		</AccordionTrigger>
	);
}

function NbAccordionContent({
	className,
	...props
}: React.ComponentProps<typeof AccordionContent>) {
	return <AccordionContent className={cn("px-3 pt-3 space-y-4", className)} {...props} />;
}

export { NbAccordion, NbAccordionContent, NbAccordionItem, NbAccordionTrigger };
