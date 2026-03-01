import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { OverlayPosition } from "@/shared/types";

const POSITIONS: Array<{ value: OverlayPosition; label: string; cls: string }> = [
	{ value: "top-left", label: "↖", cls: "col-start-1 row-start-1" },
	{ value: "top-right", label: "↗", cls: "col-start-3 row-start-1" },
	{ value: "center", label: "●", cls: "col-start-2 row-start-2" },
	{ value: "bottom-left", label: "↙", cls: "col-start-1 row-start-3" },
	{ value: "bottom-right", label: "↘", cls: "col-start-3 row-start-3" },
];

interface PositionGridProps {
	value: OverlayPosition;
	onChange: (v: OverlayPosition) => void;
}

export function PositionGrid({ value, onChange }: PositionGridProps) {
	return (
		<ToggleGroup
			type="single"
			value={value}
			onValueChange={(v) => {
				if (v) onChange(v as OverlayPosition);
			}}
			className="grid grid-cols-3 grid-rows-3 gap-1.5 w-24 h-24"
		>
			{POSITIONS.map((pos) => (
				<ToggleGroupItem
					key={pos.value}
					value={pos.value}
					title={pos.value}
					className={cn(pos.cls, "text-sm font-bold")}
				>
					{pos.label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
