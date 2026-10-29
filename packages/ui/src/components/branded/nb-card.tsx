import { Card } from "@memeover/ui/components/ui/card";
import { NB_CARD } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import type * as React from "react";

// ─── NbCard — Neo-brutalist card ─────────────────────────────────────────────
// Wraps shadcn Card with thick border + 4px offset shadow.
// Re-exports all Card sub-components so consumers get a one-stop import.

function NbCard({ className, ...props }: React.ComponentProps<typeof Card>) {
	return <Card className={cn(NB_CARD, className)} {...props} />;
}

export {
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@memeover/ui/components/ui/card";
export { NbCard };
