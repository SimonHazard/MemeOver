import {
	NbAccordion,
	NbAccordionContent,
	NbAccordionItem,
	NbAccordionTrigger,
} from "@memeover/ui/components/branded/nb-accordion";
import { Label } from "@memeover/ui/components/ui/label";
import { Slider } from "@memeover/ui/components/ui/slider";
import { Switch } from "@memeover/ui/components/ui/switch";
import { useTranslation } from "react-i18next";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { ColorPicker } from "../../color-picker";
import { SectionHeader } from "../components/section-header";
import { useOverlayFormContext } from "../form-hook";

export function AppearanceSection() {
	const form = useOverlayFormContext();
	const { t } = useTranslation();

	return (
		<div className="space-y-5">
			<SectionHeader
				title={t("display.group_appearance")}
				hint={t("display.group_appearance_hint")}
			/>

			{/* Media opacity */}
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

			{/* Global background toggle */}
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

			{/* Conditional — only when background is enabled */}
			<form.Subscribe selector={(s) => s.values.bgEnabled}>
				{(bgEnabled) =>
					bgEnabled ? (
						<NbAccordion type="multiple">
							{/* Background item — fill, shape, padding */}
							<NbAccordionItem value="background">
								<NbAccordionTrigger>{t("display.customize_background")}</NbAccordionTrigger>
								<NbAccordionContent>
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

									<form.Field name="bgOpacity">
										{(field) => (
											<div className="space-y-3">
												<div className="flex justify-between">
													<Label className="font-display tracking-wide text-xs">
														{t("display.bg_opacity")}
													</Label>
													<span className="text-sm text-muted-foreground">
														{field.state.value}%
													</span>
												</div>
												<Slider
													min={0}
													max={100}
													step={1}
													value={[field.state.value]}
													onValueChange={([v]) =>
														field.handleChange(v ?? DEFAULT_SETTINGS.bgOpacity)
													}
												/>
											</div>
										)}
									</form.Field>

									<form.Field name="bgPadding">
										{(field) => (
											<div className="space-y-3">
												<div className="flex justify-between">
													<Label className="font-display tracking-wide text-xs">
														{t("display.bg_padding")}
													</Label>
													<span className="text-sm text-muted-foreground">
														{field.state.value}px
													</span>
												</div>
												<Slider
													min={0}
													max={100}
													step={1}
													value={[field.state.value]}
													onValueChange={([v]) =>
														field.handleChange(v ?? DEFAULT_SETTINGS.bgPadding)
													}
												/>
											</div>
										)}
									</form.Field>

									<form.Field name="bgBorderRadius">
										{(field) => (
											<div className="space-y-3">
												<div className="flex justify-between">
													<Label className="font-display tracking-wide text-xs">
														{t("display.bg_border_radius")}
													</Label>
													<span className="text-sm text-muted-foreground">
														{field.state.value}px
													</span>
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
								</NbAccordionContent>
							</NbAccordionItem>

							{/* Border item — stroke color/width/opacity */}
							<NbAccordionItem value="border">
								<NbAccordionTrigger>{t("display.customize_border")}</NbAccordionTrigger>
								<NbAccordionContent>
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

									<form.Field name="bgBorderWidth">
										{(field) => (
											<div className="space-y-3">
												<div className="flex justify-between">
													<Label className="font-display tracking-wide text-xs">
														{t("display.bg_border_width")}
													</Label>
													<span className="text-sm text-muted-foreground">
														{field.state.value}px
													</span>
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

									<form.Field name="bgBorderOpacity">
										{(field) => (
											<div className="space-y-3">
												<div className="flex justify-between">
													<Label className="font-display tracking-wide text-xs">
														{t("display.bg_border_opacity")}
													</Label>
													<span className="text-sm text-muted-foreground">
														{field.state.value}%
													</span>
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
								</NbAccordionContent>
							</NbAccordionItem>
						</NbAccordion>
					) : null
				}
			</form.Subscribe>
		</div>
	);
}
