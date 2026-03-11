import type * as React from "react";

import { cn } from "@memeover/ui/lib/utils";
import { NB_BTN_BASE, NB_BTN_DISABLED, NB_BTN_LG, NB_BTN_SM } from "@memeover/ui/lib/nb-classes";
import { Button } from "@memeover/ui/components/ui/button";

// ─── NbButton — Neo-brutalist button ─────────────────────────────────────────
// Wraps shadcn Button with thick borders, offset shadow, and press animation.
// Accepts all shadcn Button props — className merges on top of NB defaults.

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

type ButtonProps = React.ComponentProps<typeof Button>;
type NbButtonProps = ButtonProps & {
	/** Disable the neo-brutalist disabled styling (use shadcn default instead) */
	nbDisabled?: boolean;
};

function NbButton({
	className,
	size = "default",
	nbDisabled = true,
	...props
}: NbButtonProps) {
	const nbSize = nbSizeMap[size ?? "default"];

	return (
		<Button
			size={size}
			className={cn(
				nbSize,
				nbDisabled && NB_BTN_DISABLED,
				className,
			)}
			{...props}
		/>
	);
}

export { NbButton, nbSizeMap };
export type { NbButtonProps };
