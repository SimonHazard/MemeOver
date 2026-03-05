import {
	ArrowDown,
	ArrowDownLeft,
	ArrowDownRight,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	ArrowUpLeft,
	ArrowUpRight,
	Crosshair,
} from "lucide-react";
import type { ReactNode } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { OverlayPosition } from "@/shared/types";

const POSITIONS: Array<{ value: OverlayPosition; icon: ReactNode; label: string; cls: string }> = [
	{
		value: "top-left",
		icon: <ArrowUpLeft size={13} strokeWidth={2.5} />,
		label: "Top left",
		cls: "col-start-1 row-start-1",
	},
	{
		value: "top",
		icon: <ArrowUp size={13} strokeWidth={2.5} />,
		label: "Top center",
		cls: "col-start-2 row-start-1",
	},
	{
		value: "top-right",
		icon: <ArrowUpRight size={13} strokeWidth={2.5} />,
		label: "Top right",
		cls: "col-start-3 row-start-1",
	},
	{
		value: "left",
		icon: <ArrowLeft size={13} strokeWidth={2.5} />,
		label: "Middle left",
		cls: "col-start-1 row-start-2",
	},
	{
		value: "center",
		icon: <Crosshair size={13} strokeWidth={2.5} />,
		label: "Center",
		cls: "col-start-2 row-start-2",
	},
	{
		value: "right",
		icon: <ArrowRight size={13} strokeWidth={2.5} />,
		label: "Middle right",
		cls: "col-start-3 row-start-2",
	},
	{
		value: "bottom-left",
		icon: <ArrowDownLeft size={13} strokeWidth={2.5} />,
		label: "Bottom left",
		cls: "col-start-1 row-start-3",
	},
	{
		value: "bottom",
		icon: <ArrowDown size={13} strokeWidth={2.5} />,
		label: "Bottom center",
		cls: "col-start-2 row-start-3",
	},
	{
		value: "bottom-right",
		icon: <ArrowDownRight size={13} strokeWidth={2.5} />,
		label: "Bottom right",
		cls: "col-start-3 row-start-3",
	},
];

const ITEM_BASE = [
	"relative flex items-center justify-center p-0",
	"border-2 border-foreground !rounded-none",
	"shadow-[2px_2px_0px_0px_var(--nb-shadow)]",
	"bg-background text-foreground",
	"transition-all duration-75 ease-out",
	"hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_0px_var(--nb-shadow)]",
	"active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
	"data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
	"data-[state=on]:translate-x-[2px] data-[state=on]:translate-y-[2px] data-[state=on]:shadow-none",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
].join(" ");

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
			className="grid grid-cols-3 grid-rows-3 gap-1 w-30 h-30"
		>
			{POSITIONS.map((pos) => (
				<ToggleGroupItem
					key={pos.value}
					value={pos.value}
					aria-label={pos.label}
					title={pos.label}
					className={cn(pos.cls, ITEM_BASE)}
				>
					{pos.icon}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
