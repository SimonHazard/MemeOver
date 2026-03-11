import { Label } from "@memeover/ui/components/ui/label";
import { Separator } from "@memeover/ui/components/ui/separator";
import { Slider } from "@memeover/ui/components/ui/slider";
import { Switch } from "@memeover/ui/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@memeover/ui/components/ui/toggle-group";
import { NB_TOGGLE_ITEM } from "@memeover/ui/lib/nb-classes";
import { Type } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TextSize } from "@/shared/types";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { ColorPicker } from "../../color-picker";
import { PositionGrid } from "../../position-grid";
import { PositionPreview } from "../../position-preview";
import { useOverlayFormContext } from "../form-hook";

const TEXT_SIZE_KEYS: TextSize[] = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"];

export function DisplaySettingsSection() {
	const form = useOverlayFormContext();
	const { t } = useTranslation();

	return (
		<div className="space-y-5">
			<h2 className="font-display text-base tracking-wide">{t("display.settings")}</h2>

			<Separator />

			{/* Media size */}
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

			{/* Opacity */}
			<form.Field name="mediaOpacity">
				{(field) => (
					<div className="space-y-3">
						<div className="flex justify-between">
							<Label className="font-display tracking-wide text-xs">{t("display.opacity")}</Label>
							<span className="text-sm text-muted-foreground">{field.state.value}%</span>
						</div>
						<Slider
							min={0}
							max={100}
							step={1}
							value={[field.state.value]}
							onValueChange={([v]) => field.handleChange(v ?? DEFAULT_SETTINGS.mediaOpacity)}
						/>
					</div>
				)}
			</form.Field>

			{/* Text size */}
			<form.Field name="textSize">
				{(field) => (
					<div className="space-y-3">
						<Label className="font-display tracking-wide text-xs">{t("display.textSize")}</Label>
						<ToggleGroup
							type="single"
							value={field.state.value}
							onValueChange={(v) => {
								if (v) field.handleChange(v as TextSize);
							}}
							className="flex flex-wrap gap-1.5 justify-start"
						>
							{TEXT_SIZE_KEYS.map((size) => (
								<ToggleGroupItem key={size} value={size} size="sm" className={NB_TOGGLE_ITEM}>
									<Type className="h-3.5 w-3.5" />
									{size}
								</ToggleGroupItem>
							))}
						</ToggleGroup>
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

			{/* Position */}
			<form.Field name="position">
				{(field) => (
					<div className="space-y-3">
						<Label className="font-display tracking-wide text-xs">{t("display.position")}</Label>
						<PositionGrid value={field.state.value} onChange={field.handleChange} />
					</div>
				)}
			</form.Field>

			{/* Position preview — reactive to position + mediaSize */}
			<form.Subscribe selector={(s) => [s.values.position, s.values.mediaSize] as const}>
				{([position, mediaSize]) => (
					<div className="space-y-2">
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
