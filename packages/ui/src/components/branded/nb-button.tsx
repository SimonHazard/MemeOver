import { Button } from "@memeover/ui/components/ui/button";
import { NB_BTN_BASE, NB_BTN_DISABLED, NB_BTN_LG, NB_BTN_SM } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import type * as React from "react";

const nbSizeMap = {
	default: NB_BTN_BASE,
	xs: NB_BTN_SM,
	sm: NB_BTN_SM,
	lg: NB_BTN_LG,
	"icon-xs": NB_BTN_BASE,
	"icon-sm": NB_BTN_BASE,
	icon: NB_BTN_BASE,
	"icon-lg": NB_BTN_LG,
} as const;

type NbButtonProps = React.ComponentProps<typeof Button>;

function NbButton({ className, size = "default", ...props }: NbButtonProps) {
	const nbSize = nbSizeMap[size ?? "default"];

	return <Button size={size} className={cn(nbSize, NB_BTN_DISABLED, className)} {...props} />;
}

export type { NbButtonProps };
export { NbButton };
