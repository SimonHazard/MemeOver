import { Badge } from "@memeover/ui/components/ui/badge";
import { NB_BADGE } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import type * as React from "react";

// ─── NbBadge — Neo-brutalist badge ───────────────────────────────────────────
// Wraps shadcn Badge with thick border, display font, and tight tracking.
// Overrides the default rounded-full with rounded-md for the blocky NB look.

type BadgeProps = React.ComponentProps<typeof Badge>;

function NbBadge({ className, ...props }: BadgeProps) {
	return <Badge className={cn(NB_BADGE, className)} {...props} />;
}

export type { BadgeProps as NbBadgeProps };
export { NbBadge };
