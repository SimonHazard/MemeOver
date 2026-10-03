import { ToggleGroup, ToggleGroupItem } from "@memeover/ui/components/ui/toggle-group";
import { cn } from "@memeover/ui/lib/utils";
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
import { useTranslation } from "react-i18next";
import type { OverlayPosition } from "@/shared/types";

const POSITIONS: Array<{ value: OverlayPosition; icon: ReactNode; labelKey: string; cls: string }> =
	[
		{
			value: "top-left",
			icon: <ArrowUpLeft size={13} strokeWidth={2.5} />,
			labelKey: "display.position_top_left",
			cls: "col-start-1 row-start-1",
		},
		{
			value: "top",
			icon: <ArrowUp size={13} strokeWidth={2.5} />,
			labelKey: "display.position_top",
			cls: "col-start-2 row-start-1",
		},
		{
			value: "top-right",
			icon: <ArrowUpRight size={13} strokeWidth={2.5} />,
			labelKey: "display.position_top_right",
			cls: "col-start-3 row-start-1",
		},
		{
			value: "left",
			icon: <ArrowLeft size={13} strokeWidth={2.5} />,
			labelKey: "display.position_left",
			cls: "col-start-1 row-start-2",
		},
		{
			value: "center",
			icon: <Crosshair size={13} strokeWidth={2.5} />,
			labelKey: "display.position_center",
			cls: "col-start-2 row-start-2",
		},
		{
			value: "right",
			icon: <ArrowRight size={13} strokeWidth={2.5} />,
			labelKey: "display.position_right",
			cls: "col-start-3 row-start-2",
		},
		{
			value: "bottom-left",
			icon: <ArrowDownLeft size={13} strokeWidth={2.5} />,
			labelKey: "display.position_bottom_left",
			cls: "col-start-1 row-start-3",
		},
		{
			value: "bottom",
			icon: <ArrowDown size={13} strokeWidth={2.5} />,
			labelKey: "display.position_bottom",
			cls: "col-start-2 row-start-3",
		},
		{
			value: "bottom-right",
			icon: <ArrowDownRight size={13} strokeWidth={2.5} />,
			labelKey: "display.position_bottom_right",
			cls: "col-start-3 row-start-3",
		},
	];

/** Translation key per position, shared with the preview summary. */
export const POSITION_LABEL_KEYS = Object.fromEntries(
	POSITIONS.map((pos) => [pos.value, pos.labelKey]),
) as Record<OverlayPosition, string>;

const ITEM_BASE = [
	"relative flex items-center justify-center p-0",
	"border-2 border-foreground !rounded-none",
	"shadow-[2px_2px_0px_0px_var(--nb-shadow)]",
	"bg-background text-foreground",
	"transition-[translate,box-shadow,background-color,color] duration-75 ease-out",
	"hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_0px_var(--nb-shadow)]",
	"active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
	"data-pressed:bg-primary data-pressed:text-primary-foreground",
	"data-pressed:translate-x-[2px] data-pressed:translate-y-[2px] data-pressed:shadow-none",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
].join(" ");

interface PositionGridProps {
	value: OverlayPosition;
	onChange: (v: OverlayPosition) => void;
}

export function PositionGrid({ value, onChange }: PositionGridProps) {
	const { t } = useTranslation();

	return (
		<ToggleGroup
			value={[value]}
			onValueChange={([next]) => {
				if (next) onChange(next);
			}}
			className="grid grid-cols-3 grid-rows-3 gap-1 w-30 h-30"
		>
			{POSITIONS.map((pos) => (
				<ToggleGroupItem
					key={pos.value}
					value={pos.value}
					aria-label={t(pos.labelKey)}
					title={t(pos.labelKey)}
					className={cn(pos.cls, ITEM_BASE)}
				>
					{pos.icon}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
