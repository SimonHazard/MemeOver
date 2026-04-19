import { Label } from "@memeover/ui/components/ui/label";
import { Slider } from "@memeover/ui/components/ui/slider";
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
			<SectionHeader title={t("display.group_placement")} hint={t("display.group_placement_hint")} />

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

			{/* Inline preview — only on mobile; desktop gets the sticky sidebar */}
			<form.Subscribe selector={(s) => [s.values.position, s.values.mediaSize] as const}>
				{([position, mediaSize]) => (
					<div className="space-y-2 md:hidden">
						<Label className="text-muted-foreground text-xs">{t("display.preview")}</Label>
						<PositionPreview
							position={position}
							mediaSize={mediaSize}
							label={t("display.preview_media")}
						/>
					</div>
				)}
			</form.Subscribe>
		</div>
	);
}
