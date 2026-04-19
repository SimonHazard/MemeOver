import {
	NbAccordion,
	NbAccordionContent,
	NbAccordionItem,
	NbAccordionTrigger,
} from "@memeover/ui/components/branded/nb-accordion";
import { Button } from "@memeover/ui/components/ui/button";
import { Label } from "@memeover/ui/components/ui/label";
import { Slider } from "@memeover/ui/components/ui/slider";
import { NB_BTN_SM } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { MonitorSelector } from "../../monitor-selector";
import { PositionGrid } from "../../position-grid";
import { PositionPreview } from "../../position-preview";
import { SectionHeader } from "../components/section-header";
import { useOverlayFormContext } from "../form-hook";

export function PlacementSection() {
	const form = useOverlayFormContext();
	const { t } = useTranslation();

	return (
		<div className="space-y-5">
			<SectionHeader
				title={t("display.group_placement")}
				hint={t("display.group_placement_hint")}
			/>

			{/* Monitor */}
			<MonitorSelector />

			{/* Position grid */}
			<form.Field name="position">
				{(field) => (
					<div className="space-y-3">
						<Label className="font-display tracking-wide text-xs">{t("display.position")}</Label>
						<PositionGrid value={field.state.value} onChange={field.handleChange} />
					</div>
				)}
			</form.Field>

			{/* Media size — placed directly next to position so the coupling is obvious */}
			<form.Field name="mediaSize">
				{(field) => (
					<div className="space-y-3">
						<div className="flex justify-between">
							<Label className="font-display tracking-wide text-xs">{t("display.size")}</Label>
							<span className="text-sm text-muted-foreground">{field.state.value}%</span>
						</div>
						<Slider
							min={10}
							max={90}
							step={1}
							value={[field.state.value]}
							onValueChange={([v]) => field.handleChange(v ?? DEFAULT_SETTINGS.mediaSize)}
						/>
					</div>
				)}
			</form.Field>

			{/* Fine-tune offsets — collapsed by default to keep the section clean */}
			<NbAccordion type="single" collapsible>
				<NbAccordionItem value="offset">
					<NbAccordionTrigger>{t("display.fine_tune_position")}</NbAccordionTrigger>
					<NbAccordionContent>
						<form.Field name="positionOffsetX">
							{(field) => (
								<div className="space-y-3">
									<div className="flex justify-between">
										<Label className="font-display tracking-wide text-xs">
											{t("display.offsetX")}
										</Label>
										<span className="text-sm text-muted-foreground">
											{field.state.value > 0 ? "+" : ""}
											{field.state.value}%
										</span>
									</div>
									<Slider
										min={-20}
										max={20}
										step={1}
										value={[field.state.value]}
										onValueChange={([v]) =>
											field.handleChange(v ?? DEFAULT_SETTINGS.positionOffsetX)
										}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="positionOffsetY">
							{(field) => (
								<div className="space-y-3">
									<div className="flex justify-between">
										<Label className="font-display tracking-wide text-xs">
											{t("display.offsetY")}
										</Label>
										<span className="text-sm text-muted-foreground">
											{field.state.value > 0 ? "+" : ""}
											{field.state.value}%
										</span>
									</div>
									<Slider
										min={-20}
										max={20}
										step={1}
										value={[field.state.value]}
										onValueChange={([v]) =>
											field.handleChange(v ?? DEFAULT_SETTINGS.positionOffsetY)
										}
									/>
								</div>
							)}
						</form.Field>

						<form.Subscribe
							selector={(s) =>
								s.values.positionOffsetX !== DEFAULT_SETTINGS.positionOffsetX ||
								s.values.positionOffsetY !== DEFAULT_SETTINGS.positionOffsetY
							}
						>
							{(hasOffset) => (
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={!hasOffset}
									className={cn(
										NB_BTN_SM,
										"gap-2 bg-background hover:bg-primary-400/15 hover:border-foreground",
										"disabled:opacity-40 disabled:shadow-none disabled:pointer-events-none",
									)}
									onClick={() => {
										form.setFieldValue("positionOffsetX", DEFAULT_SETTINGS.positionOffsetX);
										form.setFieldValue("positionOffsetY", DEFAULT_SETTINGS.positionOffsetY);
									}}
								>
									<RotateCcw className="h-3.5 w-3.5" />
									{t("display.reset_offset")}
								</Button>
							)}
						</form.Subscribe>
					</NbAccordionContent>
				</NbAccordionItem>
			</NbAccordion>

			{/* Inline preview — only on mobile; desktop gets the sticky sidebar */}
			<form.Subscribe
				selector={(s) =>
					[
						s.values.position,
						s.values.mediaSize,
						s.values.positionOffsetX,
						s.values.positionOffsetY,
					] as const
				}
			>
				{([position, mediaSize, offsetX, offsetY]) => (
					<div className="space-y-2 md:hidden">
						<Label className="text-muted-foreground text-xs">{t("display.preview")}</Label>
						<PositionPreview
							position={position}
							mediaSize={mediaSize}
							offsetX={offsetX}
							offsetY={offsetY}
							label={t("display.preview_media")}
						/>
					</div>
				)}
			</form.Subscribe>
		</div>
	);
}
