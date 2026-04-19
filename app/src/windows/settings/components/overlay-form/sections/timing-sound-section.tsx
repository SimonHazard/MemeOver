import { Label } from "@memeover/ui/components/ui/label";
import { Slider } from "@memeover/ui/components/ui/slider";
import { Switch } from "@memeover/ui/components/ui/switch";
import { useTranslation } from "react-i18next";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { SectionHeader } from "../components/section-header";
import { useOverlayFormContext } from "../form-hook";

export function TimingSoundSection() {
	const form = useOverlayFormContext();
	const { t } = useTranslation();

	return (
		<div className="space-y-5">
			<SectionHeader title={t("display.group_timing")} hint={t("display.group_timing_hint")} />

			{/* Duration */}
			<form.Field name="duration">
				{(field) => (
					<div className="space-y-3">
						<div className="flex justify-between">
							<Label className="font-display tracking-wide text-xs">{t("display.duration")}</Label>
							<span className="text-sm text-muted-foreground">
								{field.state.value} {t("display.duration_unit")}
							</span>
						</div>
						<Slider
							min={1}
							max={30}
							step={1}
							value={[field.state.value]}
							onValueChange={([v]) => field.handleChange(v ?? DEFAULT_SETTINGS.duration)}
						/>
					</div>
				)}
			</form.Field>

			{/* Sync with media duration */}
			<form.Field name="syncMediaDuration">
				{(field) => (
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-0.5">
							<Label className="font-display tracking-wide text-xs">
								{t("display.syncMediaDuration")}
							</Label>
							<p className="text-xs text-muted-foreground">{t("display.syncMediaDuration_hint")}</p>
						</div>
						<Switch
							checked={field.state.value}
							onCheckedChange={field.handleChange}
							className="shrink-0 mt-0.5"
						/>
					</div>
				)}
			</form.Field>

			{/* Volume */}
			<form.Field name="volume">
				{(field) => (
					<div className="space-y-3">
						<div className="flex justify-between">
							<Label className="font-display tracking-wide text-xs">{t("display.volume")}</Label>
							<span className="text-sm text-muted-foreground">{field.state.value}%</span>
						</div>
						<Slider
							min={0}
							max={100}
							step={1}
							value={[field.state.value]}
							onValueChange={([v]) => field.handleChange(v ?? DEFAULT_SETTINGS.volume)}
						/>
					</div>
				)}
			</form.Field>
		</div>
	);
}
