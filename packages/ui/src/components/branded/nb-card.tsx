import type * as React from "react";

import { cn } from "@memeover/ui/lib/utils";
import { NB_CARD } from "@memeover/ui/lib/nb-classes";
import { Card } from "@memeover/ui/components/ui/card";

// ─── NbCard — Neo-brutalist card ─────────────────────────────────────────────
// Wraps shadcn Card with thick border + 4px offset shadow.
// Re-exports all Card sub-components so consumers get a one-stop import.

function NbCard({ className, ...props }: React.ComponentProps<typeof Card>) {
	return <Card className={cn(NB_CARD, className)} {...props} />;
}

export { NbCard };
export {
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
} from "@memeover/ui/components/ui/card";
