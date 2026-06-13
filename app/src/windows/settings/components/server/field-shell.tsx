import { Label } from "@memeover/ui/components/ui/label";
import type { ReactNode } from "react";

export function FieldShell({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			<Label className="font-display text-xs tracking-wide">{label}</Label>
			{children}
			{hint && <p className="font-text text-xs text-muted-foreground">{hint}</p>}
		</div>
	);
}
