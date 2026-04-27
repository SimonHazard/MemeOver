import { Input } from "@memeover/ui/components/ui/input";
import { Label } from "@memeover/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@memeover/ui/components/ui/select";
import { Slider } from "@memeover/ui/components/ui/slider";
import { Switch } from "@memeover/ui/components/ui/switch";
import { useTranslation } from "react-i18next";
import type { FloatingReactionPreset } from "@/shared/types";
import { DEFAULT_SETTINGS, FLOATING_REACTION_PRESETS } from "@/shared/types";
import { SectionHeader } from "../components/section-header";
import { useOverlayFormContext } from "../form-hook";

const REACTION_PRESET_COPY: Record<
	FloatingReactionPreset,
	{
		labelKey: string;
		descriptionKey: string;
	}
> = {
	straight: {
		labelKey: "display.reactions_preset_straight",
		descriptionKey: "display.reactions_preset_straight_hint",
	},
	serpentine: {
		labelKey: "display.reactions_preset_serpentine",
		descriptionKey: "display.reactions_preset_serpentine_hint",
	},
	bounce: {
		labelKey: "display.reactions_preset_bounce",
		descriptionKey: "display.reactions_preset_bounce_hint",
	},
	confetti: {
		labelKey: "display.reactions_preset_confetti",
		descriptionKey: "display.reactions_preset_confetti_hint",
	},
	pop: {
		labelKey: "display.reactions_preset_pop",
		descriptionKey: "display.reactions_preset_pop_hint",
	},
	firework: {
		labelKey: "display.reactions_preset_firework",
		descriptionKey: "display.reactions_preset_firework_hint",
	},
	random: {
		labelKey: "display.reactions_preset_random",
		descriptionKey: "display.reactions_preset_random_hint",
	},
};

const REACTION_PRESETS: ReadonlyArray<{
	value: (typeof FLOATING_REACTION_PRESETS)[number];
	labelKey: string;
	descriptionKey: string;
}> = FLOATING_REACTION_PRESETS.map((value) => ({ value, ...REACTION_PRESET_COPY[value] }));

const REACTION_SIZE_MIN = 3;
const REACTION_SIZE_MAX = 12;

function clampReactionSize(n: number): number {
	return Math.max(REACTION_SIZE_MIN, Math.min(REACTION_SIZE_MAX, Math.round(n)));
}

export function ReactionsSection() {
	const form = useOverlayFormContext();
	const { t } = useTranslation();

	return (
		<div className="space-y-5">
			<SectionHeader
				title={t("display.group_reactions")}
				hint={t("display.group_reactions_hint")}
			/>

			<form.Field name="floatingReactionsEnabled">
				{(field) => (
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-0.5">
							<Label className="font-display tracking-wide text-xs">
								{t("display.reactions_enabled")}
							</Label>
							<p className="text-xs text-muted-foreground">{t("display.reactions_enabled_hint")}</p>
						</div>
						<Switch
							checked={field.state.value}
							onCheckedChange={field.handleChange}
							className="shrink-0 mt-0.5"
						/>
					</div>
				)}
			</form.Field>

			<form.Subscribe selector={(s) => s.values.floatingReactionsEnabled}>
				{(enabled) =>
					enabled ? (
						<div className="space-y-5">
							<form.Field name="floatingReactionPreset">
								{(field) => (
									<div className="space-y-2">
										<Label className="font-display tracking-wide text-xs">
											{t("display.reactions_preset")}
										</Label>
										<Select
											value={field.state.value}
											onValueChange={(value) => field.handleChange(value as FloatingReactionPreset)}
										>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													{REACTION_PRESETS.map((preset) => (
														<SelectItem key={preset.value} value={preset.value}>
															{t(preset.labelKey)}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
										<p className="text-xs text-muted-foreground">
											{t(
												REACTION_PRESETS.find((preset) => preset.value === field.state.value)
													?.descriptionKey ?? "display.reactions_preset_straight_hint",
											)}
										</p>
									</div>
								)}
							</form.Field>

							<form.Field name="floatingReactionDuration">
								{(field) => (
									<div className="space-y-3">
										<div className="flex justify-between">
											<Label className="font-display tracking-wide text-xs">
												{t("display.reactions_duration")}
											</Label>
											<span className="text-sm text-muted-foreground">
												{field.state.value} {t("display.duration_unit")}
											</span>
										</div>
										<Slider
											min={2}
											max={10}
											step={1}
											value={[field.state.value]}
											onValueChange={([v]) =>
												field.handleChange(v ?? DEFAULT_SETTINGS.floatingReactionDuration)
											}
										/>
									</div>
								)}
							</form.Field>

							<form.Field name="floatingReactionOpacity">
								{(field) => (
									<div className="space-y-3">
										<div className="flex justify-between">
											<Label className="font-display tracking-wide text-xs">
												{t("display.reactions_opacity")}
											</Label>
											<span className="text-sm text-muted-foreground">{field.state.value}%</span>
										</div>
										<Slider
											min={20}
											max={100}
											step={1}
											value={[field.state.value]}
											onValueChange={([v]) =>
												field.handleChange(v ?? DEFAULT_SETTINGS.floatingReactionOpacity)
											}
										/>
									</div>
								)}
							</form.Field>

							<form.Field name="floatingReactionSize">
								{(field) => (
									<div className="space-y-3">
										<div className="flex justify-between">
											<Label className="font-display tracking-wide text-xs">
												{t("display.reactions_size")}
											</Label>
											<span className="text-sm text-muted-foreground">
												{field.state.value} vmin
											</span>
										</div>
										<div className="flex items-center gap-3">
											<Slider
												min={REACTION_SIZE_MIN}
												max={REACTION_SIZE_MAX}
												step={1}
												value={[field.state.value]}
												onValueChange={([v]) =>
													field.handleChange(v ?? DEFAULT_SETTINGS.floatingReactionSize)
												}
												className="flex-1"
											/>
											<Input
												type="number"
												name="floatingReactionSize"
												min={REACTION_SIZE_MIN}
												max={REACTION_SIZE_MAX}
												step={1}
												value={field.state.value}
												onChange={(e) => {
													const n = Number.parseInt(e.target.value, 10);
													if (!Number.isNaN(n)) field.handleChange(clampReactionSize(n));
												}}
												onBlur={(e) => {
													const n = Number.parseInt(e.target.value, 10);
													field.handleChange(
														Number.isNaN(n)
															? DEFAULT_SETTINGS.floatingReactionSize
															: clampReactionSize(n),
													);
												}}
												autoComplete="off"
												className="w-20 text-sm"
												aria-label={t("display.reactions_size")}
											/>
										</div>
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
