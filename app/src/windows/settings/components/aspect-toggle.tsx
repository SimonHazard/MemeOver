import { ToggleGroup, ToggleGroupItem } from "@memeover/ui/components/ui/toggle-group";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@memeover/ui/components/ui/tooltip";
import { NB_TOGGLE_ITEM } from "@memeover/ui/lib/nb-classes";
import { RectangleHorizontal, RectangleVertical, Square } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import type { PreviewAspect } from "./position-preview";

interface AspectEntry {
	value: PreviewAspect;
	icon: ComponentType<{ className?: string }>;
	labelKey: string;
}

const ASPECTS: ReadonlyArray<AspectEntry> = [
	{ value: "9:16", icon: RectangleVertical, labelKey: "display.aspect_portrait" },
	{ value: "16:9", icon: RectangleHorizontal, labelKey: "display.aspect_landscape" },
	{ value: "1:1", icon: Square, labelKey: "display.aspect_square" },
];

interface AspectToggleProps {
	value: PreviewAspect;
	onChange: (v: PreviewAspect) => void;
}

export function AspectToggle({ value, onChange }: AspectToggleProps) {
	const { t } = useTranslation();

	return (
		<TooltipProvider delay={150}>
			<ToggleGroup
				value={[value]}
				onValueChange={([next]) => {
					if (next) onChange(next);
				}}
				spacing={1.5}
				className="justify-start"
			>
				{ASPECTS.map(({ value: aspect, icon: Icon, labelKey }) => {
					const label = t(labelKey);
					return (
						<Tooltip key={aspect}>
							<TooltipTrigger
								render={
									<ToggleGroupItem
										value={aspect}
										size="sm"
										aria-label={label}
										className={NB_TOGGLE_ITEM}
									/>
								}
							>
								<Icon className="h-4 w-4" />
							</TooltipTrigger>
							<TooltipContent side="bottom">{label}</TooltipContent>
						</Tooltip>
					);
				})}
			</ToggleGroup>
		</TooltipProvider>
	);
}
