import type * as React from "react";

import { Switch } from "@memeover/ui/components/ui/switch";
import { NB_SWITCH } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";

// ─── NbSwitch — Neo-brutalist switch ─────────────────────────────────────────
// Wraps shadcn Switch with a thick track border and a lifted "on" state, so
// every switch in the app shares one look instead of per-call-site borders.

function NbSwitch({ className, ...props }: React.ComponentProps<typeof Switch>) {
	return <Switch className={cn(NB_SWITCH, className)} {...props} />;
}

export { NbSwitch };
