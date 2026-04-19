import { Input } from "@memeover/ui/components/ui/input";
import { Label } from "@memeover/ui/components/ui/label";
import { Slider } from "@memeover/ui/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@memeover/ui/components/ui/toggle-group";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@memeover/ui/components/ui/tooltip";
import { NB_TOGGLE_ITEM } from "@memeover/ui/lib/nb-classes";
import {
	AlignEndHorizontal,
	AlignHorizontalJustifyCenter,
	AlignStartHorizontal,
	PanelBottom,
	PanelTop,
} from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import type { TextPosition } from "@/shared/types";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { ColorPicker } from "../../color-picker";
import { SectionHeader } from "../components/section-header";
import { useOverlayFormContext } from "../form-hook";

const TEXT_SIZE_MIN = 12;
const TEXT_SIZE_MAX = 96;

const TEXT_POSITIONS: ReadonlyArray<{
	value: TextPosition;
	icon: ComponentType<{ className?: string }>;
	labelKey: string;
}> = [
	{ value: "above", icon: AlignStartHorizontal, labelKey: "display.textPos_above" },
	{ value: "below", icon: AlignEndHorizontal, labelKey: "display.textPos_below" },
	{ value: "overlay-top", icon: PanelTop, labelKey: "display.textPos_overlay_top" },
	{
		value: "overlay-middle",
		icon: AlignHorizontalJustifyCenter,
		labelKey: "display.textPos_overlay_middle",
	},
	{ value: "overlay-bottom", icon: PanelBottom, labelKey: "display.textPos_overlay_bottom" },
];

function clampTextSize(n: number): number {
	return Math.max(TEXT_SIZE_MIN, Math.min(TEXT_SIZE_MAX, Math.round(n)));
}

export function TextSection() {
	const form = useOverlayFormContext();
	const { t } = useTranslation();

	return (
		<div className="space-y-5">
			<SectionHeader title={t("display.group_text")} hint={t("display.group_text_hint")} />

			{/* Text size — slider + numeric input */}
			<form.Field name="textSize">
				{(field) => (
					<div className="space-y-3">
						<div className="flex justify-between">
							<Label className="font-display tracking-wide text-xs">{t("display.textSize")}</Label>
							<span className="text-sm text-muted-foreground">{field.state.value}px</span>
						</div>
						<div className="flex items-center gap-3">
							<Slider
								min={TEXT_SIZE_MIN}
								max={TEXT_SIZE_MAX}
								step={1}
								value={[field.state.value]}
								onValueChange={([v]) => field.handleChange(v ?? DEFAULT_SETTINGS.textSize)}
								className="flex-1"
							/>
							<Input
								type="number"
								min={TEXT_SIZE_MIN}
								max={TEXT_SIZE_MAX}
								step={1}
								value={field.state.value}
								onChange={(e) => {
									const n = Number.parseInt(e.target.value, 10);
									if (!Number.isNaN(n)) field.handleChange(clampTextSize(n));
								}}
								onBlur={(e) => {
									// Re-clamp on blur so an empty/invalid input recovers cleanly
									const n = Number.parseInt(e.target.value, 10);
									field.handleChange(
										Number.isNaN(n) ? DEFAULT_SETTINGS.textSize : clampTextSize(n),
									);
								}}
								className="w-20 text-sm"
								aria-label={t("display.textSize")}
							/>
						</div>
					</div>
				)}
			</form.Field>

			{/* Text position relative to media */}
			<form.Field name="textPosition">
				{(field) => (
					<div className="space-y-3">
						<Label className="font-display tracking-wide text-xs">
							{t("display.textPosition")}
						</Label>
						<TooltipProvider delayDuration={150}>
							<ToggleGroup
								type="single"
								value={field.state.value}
								onValueChange={(v) => {
									if (v) field.handleChange(v as TextPosition);
								}}
								className="flex gap-1.5 justify-start"
							>
								{TEXT_POSITIONS.map(({ value, icon: Icon, labelKey }) => {
									const label = t(labelKey);
									return (
										<Tooltip key={value}>
											<TooltipTrigger asChild>
												{/* span absorbs Tooltip's `data-state` so ToggleGroupItem can keep
												    its own (which drives the selected background color). */}
												<span className="inline-flex">
													<ToggleGroupItem
														value={value}
														size="sm"
														className={NB_TOGGLE_ITEM}
														aria-label={label}
													>
														<Icon className="h-4 w-4" />
													</ToggleGroupItem>
												</span>
											</TooltipTrigger>
											<TooltipContent side="bottom">{label}</TooltipContent>
										</Tooltip>
									);
								})}
							</ToggleGroup>
						</TooltipProvider>
					</div>
				)}
			</form.Field>

			{/* Text color */}
			<form.Field name="textColor">
				{(field) => (
					<div className="space-y-2">
						<Label className="font-display tracking-wide text-xs">{t("display.textColor")}</Label>
						<ColorPicker
							value={field.state.value}
							onChange={field.handleChange}
							onReset={() => field.handleChange(DEFAULT_SETTINGS.textColor)}
						/>
					</div>
				)}
			</form.Field>
		</div>
	);
}
