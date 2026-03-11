import { Label } from "@memeover/ui/components/ui/label";
import { Separator } from "@memeover/ui/components/ui/separator";
import { Slider } from "@memeover/ui/components/ui/slider";
import { Switch } from "@memeover/ui/components/ui/switch";
import { useTranslation } from "react-i18next";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { ColorPicker } from "../../color-picker";
import { useOverlayFormContext } from "../form-hook";

export function BackgroundSettingsSection() {
	const form = useOverlayFormContext();
	const { t } = useTranslation();

	return (
		<div className="space-y-4">
			<Separator />

			{/* Enable global background */}
			<form.Field name="bgEnabled">
				{(field) => (
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-0.5">
							<Label className="font-display tracking-wide text-xs">
								{t("display.bg_enabled")}
							</Label>
							<p className="text-xs text-muted-foreground">{t("display.bg_enabled_hint")}</p>
						</div>
						<Switch
							checked={field.state.value}
							onCheckedChange={field.handleChange}
							className="shrink-0 mt-0.5"
						/>
					</div>
				)}
			</form.Field>

			{/* Conditional background customisation */}
			<form.Subscribe selector={(s) => s.values.bgEnabled}>
				{(bgEnabled) =>
					bgEnabled ? (
						<div className="space-y-4">
							{/* Background color */}
							<form.Field name="bgColor">
								{(field) => (
									<div className="space-y-2">
										<Label className="font-display tracking-wide text-xs">
											{t("display.bg_color")}
										</Label>
										<ColorPicker
											value={field.state.value}
											onChange={field.handleChange}
											onReset={() => field.handleChange(DEFAULT_SETTINGS.bgColor)}
										/>
									</div>
								)}
							</form.Field>

							{/* Background opacity */}
							<form.Field name="bgOpacity">
								{(field) => (
									<div className="space-y-3">
										<div className="flex justify-between">
											<Label className="font-display tracking-wide text-xs">
												{t("display.bg_opacity")}
											</Label>
											<span className="text-sm text-muted-foreground">{field.state.value}%</span>
										</div>
										<Slider
											min={0}
											max={100}
											step={1}
											value={[field.state.value]}
											onValueChange={([v]) => field.handleChange(v ?? DEFAULT_SETTINGS.bgOpacity)}
										/>
									</div>
								)}
							</form.Field>

							{/* Inner padding */}
							<form.Field name="bgPadding">
								{(field) => (
									<div className="space-y-3">
										<div className="flex justify-between">
											<Label className="font-display tracking-wide text-xs">
												{t("display.bg_padding")}
											</Label>
											<span className="text-sm text-muted-foreground">{field.state.value}px</span>
										</div>
										<Slider
											min={0}
											max={100}
											step={1}
											value={[field.state.value]}
											onValueChange={([v]) => field.handleChange(v ?? DEFAULT_SETTINGS.bgPadding)}
										/>
									</div>
								)}
							</form.Field>

							{/* Border radius */}
							<form.Field name="bgBorderRadius">
								{(field) => (
									<div className="space-y-3">
										<div className="flex justify-between">
											<Label className="font-display tracking-wide text-xs">
												{t("display.bg_border_radius")}
											</Label>
											<span className="text-sm text-muted-foreground">{field.state.value}px</span>
										</div>
										<Slider
											min={0}
											max={30}
											step={1}
											value={[field.state.value]}
											onValueChange={([v]) =>
												field.handleChange(v ?? DEFAULT_SETTINGS.bgBorderRadius)
											}
										/>
									</div>
								)}
							</form.Field>

							{/* Border color */}
							<form.Field name="bgBorderColor">
								{(field) => (
									<div className="space-y-2">
										<Label className="font-display tracking-wide text-xs">
											{t("display.bg_border_color")}
										</Label>
										<ColorPicker
											value={field.state.value}
											onChange={field.handleChange}
											onReset={() => field.handleChange(DEFAULT_SETTINGS.bgBorderColor)}
										/>
									</div>
								)}
							</form.Field>

							{/* Border width */}
							<form.Field name="bgBorderWidth">
								{(field) => (
									<div className="space-y-3">
										<div className="flex justify-between">
											<Label className="font-display tracking-wide text-xs">
												{t("display.bg_border_width")}
											</Label>
											<span className="text-sm text-muted-foreground">{field.state.value}px</span>
										</div>
										<Slider
											min={0}
											max={20}
											step={1}
											value={[field.state.value]}
											onValueChange={([v]) =>
												field.handleChange(v ?? DEFAULT_SETTINGS.bgBorderWidth)
											}
										/>
									</div>
								)}
							</form.Field>

							{/* Border opacity */}
							<form.Field name="bgBorderOpacity">
								{(field) => (
									<div className="space-y-3">
										<div className="flex justify-between">
											<Label className="font-display tracking-wide text-xs">
												{t("display.bg_border_opacity")}
											</Label>
											<span className="text-sm text-muted-foreground">{field.state.value}%</span>
										</div>
										<Slider
											min={0}
											max={100}
											step={1}
											value={[field.state.value]}
											onValueChange={([v]) =>
												field.handleChange(v ?? DEFAULT_SETTINGS.bgBorderOpacity)
											}
										/>
									</div>
								)}
							</form.Field>
						</div>
					) : null
				}
			</form.Subscribe>
		</div>
	);
}
