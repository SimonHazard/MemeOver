import { Badge } from "@memeover/ui/components/ui/badge";
import { NB_BADGE } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import type * as React from "react";

type BadgeProps = React.ComponentProps<typeof Badge>;

function NbBadge({ className, ...props }: BadgeProps) {
	return <Badge className={cn(NB_BADGE, className)} {...props} />;
}

export type { BadgeProps as NbBadgeProps };
export { NbBadge };
