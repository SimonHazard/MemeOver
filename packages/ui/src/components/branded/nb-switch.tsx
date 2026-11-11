import { Switch } from "@memeover/ui/components/ui/switch";
import { NB_SWITCH } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import type * as React from "react";

function NbSwitch({ className, ...props }: React.ComponentProps<typeof Switch>) {
	return <Switch className={cn(NB_SWITCH, className)} {...props} />;
}

export { NbSwitch };
