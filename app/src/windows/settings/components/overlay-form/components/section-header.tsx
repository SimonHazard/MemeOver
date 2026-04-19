import { Separator } from "@memeover/ui/components/ui/separator";

interface SectionHeaderProps {
	title: string;
	hint?: string;
}

export function SectionHeader({ title, hint }: SectionHeaderProps) {
	return (
		<div className="space-y-3">
			<div className="space-y-1">
				<h2 className="font-display text-base tracking-wide">{title}</h2>
				{hint && <p className="text-xs text-muted-foreground">{hint}</p>}
			</div>
			<Separator />
		</div>
	);
}
