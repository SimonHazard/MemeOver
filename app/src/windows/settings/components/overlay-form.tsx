import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import {
	Clapperboard,
	Eye,
	EyeOff,
	FileAudio,
	ImageIcon,
	MessageSquare,
	Save,
	Type,
	Video,
} from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NbCard } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
	clearQueue,
	enabledTypesToList,
	listToEnabledTypes,
	overlayHealthVariant,
	quitOverlay,
	reloadOverlay,
	showOverlay,
} from "@/shared/helpers";
import { loadSettings, persistSettings } from "@/shared/settings";
import { useAppStore } from "@/shared/store";
import type { Settings, TextSize } from "@/shared/types";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { ColorPicker } from "./color-picker";
import { PositionGrid } from "./position-grid";
import { PositionPreview } from "./position-preview";

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaSettingsFields = Pick<
	Settings,
	| "mediaSize"
	| "duration"
	| "syncMediaDuration"
	| "volume"
	| "position"
	| "enabledTypes"
	| "textSize"
	| "textColor"
	| "mediaOpacity"
	| "bgEnabled"
	| "bgColor"
	| "bgOpacity"
	| "bgBorderColor"
	| "bgBorderOpacity"
	| "bgBorderWidth"
	| "bgBorderRadius"
	| "bgPadding"
>;

export interface OverlayFormProps {
	initialData: Settings;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MEDIA_TYPE_KEYS = ["image", "gif", "video", "audio", "text"] as const;

const MEDIA_TYPE_ICONS: Record<
	(typeof MEDIA_TYPE_KEYS)[number],
	React.ComponentType<{ className?: string }>
> = {
	image: ImageIcon,
	gif: Clapperboard,
	video: Video,
	audio: FileAudio,
	text: MessageSquare,
};

const TEXT_SIZE_KEYS: TextSize[] = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"];

// ─── Component ────────────────────────────────────────────────────────────────

export function OverlayForm({ initialData }: OverlayFormProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const overlayHealth = useAppStore((s) => s.overlayHealth);
	const queueSize = useAppStore((s) => s.queueSize);
	const overlayAlive = overlayHealth === "alive";

	const [form, setForm] = useState<MediaSettingsFields>({
		mediaSize: initialData.mediaSize,
		duration: initialData.duration,
		syncMediaDuration: initialData.syncMediaDuration,
		volume: initialData.volume,
		position: initialData.position,
		enabledTypes: initialData.enabledTypes,
		textSize: initialData.textSize,
		textColor: initialData.textColor,
		mediaOpacity: initialData.mediaOpacity,
		bgEnabled: initialData.bgEnabled,
		bgColor: initialData.bgColor,
		bgOpacity: initialData.bgOpacity,
		bgBorderColor: initialData.bgBorderColor,
		bgBorderOpacity: initialData.bgBorderOpacity,
		bgBorderWidth: initialData.bgBorderWidth,
		bgBorderRadius: initialData.bgBorderRadius,
		bgPadding: initialData.bgPadding,
	});

	const snapshotRef = useRef<MediaSettingsFields>({
		mediaSize: initialData.mediaSize,
		duration: initialData.duration,
		syncMediaDuration: initialData.syncMediaDuration,
		volume: initialData.volume,
		position: initialData.position,
		enabledTypes: initialData.enabledTypes,
		textSize: initialData.textSize,
		textColor: initialData.textColor,
		mediaOpacity: initialData.mediaOpacity,
		bgEnabled: initialData.bgEnabled,
		bgColor: initialData.bgColor,
		bgOpacity: initialData.bgOpacity,
		bgBorderColor: initialData.bgBorderColor,
		bgBorderOpacity: initialData.bgBorderOpacity,
		bgBorderWidth: initialData.bgBorderWidth,
		bgBorderRadius: initialData.bgBorderRadius,
		bgPadding: initialData.bgPadding,
	});

	const isDirty = JSON.stringify(form) !== JSON.stringify(snapshotRef.current);

	const { mutate: save, isPending } = useMutation({
		mutationFn: async (partial: Partial<Settings>) => {
			const current = await queryClient.fetchQuery({
				queryKey: ["settings"],
				queryFn: loadSettings,
			});
			await persistSettings({ ...current, ...partial });
		},
		onSuccess: () => {
			snapshotRef.current = { ...form };
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
			toast.success(t("toast.displaySaved"));
		},
	});

	function update<K extends keyof MediaSettingsFields>(key: K, value: MediaSettingsFields[K]) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	// Dev-only: track whether the overlay is in prod-preview mode
	const [devPreviewActive, setDevPreviewActive] = useState(false);

	async function handleToggleDevPreview() {
		const next = !devPreviewActive;
		await invoke("toggle_overlay_preview_mode", { enabled: next });
		setDevPreviewActive(next);
	}

	const enabledCount = enabledTypesToList(form.enabledTypes).length;

	return (
		<div className="p-5">
			<div className="mx-auto max-w-xl space-y-5">
				{/* ── Overlay Controls Card ── */}
				<NbCard>
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="font-display text-base tracking-wide">{t("overlay.controls")}</h2>
							<Badge
								variant={overlayHealthVariant(overlayHealth)}
								className="border-2 border-foreground rounded-md font-display text-xs tracking-wide px-2 py-0.5"
							>
								{t(`health.${overlayHealth}`)}
							</Badge>
						</div>

						<Separator />

						<div className="grid grid-cols-3 gap-2">
							<Button
								variant="outline"
								className="w-full border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all font-display tracking-wide text-xs"
								onClick={() => void showOverlay()}
							>
								{t("overlay.show")}
							</Button>
							<Button
								variant="outline"
								className="w-full border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all font-display tracking-wide text-xs disabled:opacity-40 disabled:shadow-none"
								disabled={!overlayAlive}
								onClick={() => void reloadOverlay()}
							>
								{t("overlay.reload")}
							</Button>
							<Button
								variant="destructive"
								className="w-full border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all font-display tracking-wide text-xs disabled:opacity-40 disabled:shadow-none"
								disabled={!overlayAlive}
								onClick={() => void quitOverlay()}
							>
								{t("overlay.close")}
							</Button>
						</div>

						<Separator />

						{/* ── Dev-only: prod preview toggle ── */}
						{import.meta.env.DEV && (
							<>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="font-display text-sm tracking-wide">
											{t("overlay.dev_preview")}
										</span>
										<Badge
											variant="secondary"
											className="border border-foreground rounded-md text-xs font-mono"
										>
											DEV
										</Badge>
									</div>
									<Button
										variant={devPreviewActive ? "default" : "outline"}
										size="sm"
										className={cn(
											"border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all font-display tracking-wide text-xs gap-1.5",
											devPreviewActive && "bg-primary-400 text-black hover:bg-primary-500",
										)}
										onClick={() => void handleToggleDevPreview()}
									>
										{devPreviewActive ? (
											<EyeOff className="h-3 w-3" />
										) : (
											<Eye className="h-3 w-3" />
										)}
										{devPreviewActive
											? t("overlay.dev_preview_exit")
											: t("overlay.dev_preview_enter")}
									</Button>
								</div>
								<Separator />
							</>
						)}

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span className="font-display text-sm tracking-wide">
									{t("actions.clearQueue")}
								</span>
								{queueSize > 0 && (
									<Badge
										variant="secondary"
										className="border border-foreground rounded-md text-xs"
									>
										{t("actions.queueSize", { count: queueSize })}
									</Badge>
								)}
							</div>
							<Button
								variant="outline"
								size="sm"
								className="border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all font-display tracking-wide text-xs"
								onClick={() => void clearQueue()}
							>
								{t("actions.clearQueue")}
							</Button>
						</div>
					</div>
				</NbCard>

				{/* ── Media Display Settings Card ── */}
				<NbCard>
					<div className="space-y-5">
						<h2 className="font-display text-base tracking-wide">{t("display.settings")}</h2>

						<Separator />

						{/* Taille */}
						<div className="space-y-3">
							<div className="flex justify-between">
								<Label className="font-display tracking-wide text-xs">{t("display.size")}</Label>
								<span className="text-sm text-muted-foreground">{form.mediaSize}%</span>
							</div>
							<Slider
								min={10}
								max={90}
								step={1}
								value={[form.mediaSize]}
								onValueChange={([v]) => update("mediaSize", v ?? DEFAULT_SETTINGS.mediaSize)}
							/>
						</div>

						{/* Durée */}
						<div className="space-y-3">
							<div className="flex justify-between">
								<Label className="font-display tracking-wide text-xs">
									{t("display.duration")}
								</Label>
								<span className="text-sm text-muted-foreground">
									{form.duration} {t("display.duration_unit")}
								</span>
							</div>
							<Slider
								min={1}
								max={30}
								step={1}
								value={[form.duration]}
								onValueChange={([v]) => update("duration", v ?? DEFAULT_SETTINGS.duration)}
							/>
						</div>

						{/* Sync with media duration */}
						<div className="flex items-start justify-between gap-4">
							<div className="space-y-0.5">
								<Label className="font-display tracking-wide text-xs">
									{t("display.syncMediaDuration")}
								</Label>
								<p className="text-xs text-muted-foreground">
									{t("display.syncMediaDuration_hint")}
								</p>
							</div>
							<Switch
								checked={form.syncMediaDuration}
								onCheckedChange={(v) => update("syncMediaDuration", v)}
								className="shrink-0 mt-0.5"
							/>
						</div>

						{/* Volume */}
						<div className="space-y-3">
							<div className="flex justify-between">
								<Label className="font-display tracking-wide text-xs">{t("display.volume")}</Label>
								<span className="text-sm text-muted-foreground">{form.volume}%</span>
							</div>
							<Slider
								min={0}
								max={100}
								step={1}
								value={[form.volume]}
								onValueChange={([v]) => update("volume", v ?? DEFAULT_SETTINGS.volume)}
							/>
						</div>

						{/* Opacité */}
						<div className="space-y-3">
							<div className="flex justify-between">
								<Label className="font-display tracking-wide text-xs">{t("display.opacity")}</Label>
								<span className="text-sm text-muted-foreground">{form.mediaOpacity}%</span>
							</div>
							<Slider
								min={0}
								max={100}
								step={1}
								value={[form.mediaOpacity]}
								onValueChange={([v]) => update("mediaOpacity", v ?? DEFAULT_SETTINGS.mediaOpacity)}
							/>
						</div>

						{/* Taille du texte */}
						<div className="space-y-3">
							<Label className="font-display tracking-wide text-xs">{t("display.textSize")}</Label>
							<ToggleGroup
								type="single"
								value={form.textSize}
								onValueChange={(v) => {
									if (v) update("textSize", v as TextSize);
								}}
								className="flex flex-wrap gap-1.5 justify-start"
							>
								{TEXT_SIZE_KEYS.map((size) => (
									<ToggleGroupItem
										key={size}
										value={size}
										size="sm"
										className="gap-1.5 border-2 border-foreground/30 data-[state=on]:border-foreground data-[state=on]:bg-primary-400 data-[state=on]:text-black data-[state=off]:opacity-50 data-[state=on]:shadow-[2px_2px_0px_0px_var(--nb-shadow)] transition-all font-display text-xs tracking-wide"
									>
										<Type className="h-3.5 w-3.5" />
										{size}
									</ToggleGroupItem>
								))}
							</ToggleGroup>
						</div>

						{/* Couleur du texte */}
						<div className="space-y-2">
							<Label className="font-display tracking-wide text-xs">{t("display.textColor")}</Label>
							<ColorPicker value={form.textColor} onChange={(v) => update("textColor", v)} />
						</div>

						{/* Position */}
						<div className="space-y-3">
							<Label className="font-display tracking-wide text-xs">{t("display.position")}</Label>
							<PositionGrid value={form.position} onChange={(v) => update("position", v)} />
						</div>

						{/* Aperçu */}
						<div className="space-y-2">
							<Label className="text-muted-foreground text-xs">{t("display.preview")}</Label>
							<PositionPreview
								position={form.position}
								mediaSize={form.mediaSize}
								label={t("display.preview_media")}
							/>
						</div>

						<Separator />

						{/* ── Arrière-plan ── */}
						<div className="space-y-4">
							<div className="flex items-start justify-between gap-4">
								<div className="space-y-0.5">
									<Label className="font-display tracking-wide text-xs">
										{t("display.bg_enabled")}
									</Label>
									<p className="text-xs text-muted-foreground">{t("display.bg_enabled_hint")}</p>
								</div>
								<Switch
									checked={form.bgEnabled}
									onCheckedChange={(v) => update("bgEnabled", v)}
									className="shrink-0 mt-0.5"
								/>
							</div>

							{form.bgEnabled && (
								<div className="space-y-4">
									{/* Couleur de fond */}
									<div className="space-y-2">
										<Label className="font-display tracking-wide text-xs">
											{t("display.bg_color")}
										</Label>
										<ColorPicker value={form.bgColor} onChange={(v) => update("bgColor", v)} />
									</div>

									{/* Opacité du fond */}
									<div className="space-y-3">
										<div className="flex justify-between">
											<Label className="font-display tracking-wide text-xs">
												{t("display.bg_opacity")}
											</Label>
											<span className="text-sm text-muted-foreground">{form.bgOpacity}%</span>
										</div>
										<Slider
											min={0}
											max={100}
											step={1}
											value={[form.bgOpacity]}
											onValueChange={([v]) => update("bgOpacity", v ?? DEFAULT_SETTINGS.bgOpacity)}
										/>
									</div>

									{/* Padding */}
									<div className="space-y-3">
										<div className="flex justify-between">
											<Label className="font-display tracking-wide text-xs">
												{t("display.bg_padding")}
											</Label>
											<span className="text-sm text-muted-foreground">{form.bgPadding}px</span>
										</div>
										<Slider
											min={0}
											max={100}
											step={1}
											value={[form.bgPadding]}
											onValueChange={([v]) => update("bgPadding", v ?? DEFAULT_SETTINGS.bgPadding)}
										/>
									</div>

									{/* Arrondi */}
									<div className="space-y-3">
										<div className="flex justify-between">
											<Label className="font-display tracking-wide text-xs">
												{t("display.bg_border_radius")}
											</Label>
											<span className="text-sm text-muted-foreground">{form.bgBorderRadius}px</span>
										</div>
										<Slider
											min={0}
											max={30}
											step={1}
											value={[form.bgBorderRadius]}
											onValueChange={([v]) =>
												update("bgBorderRadius", v ?? DEFAULT_SETTINGS.bgBorderRadius)
											}
										/>
									</div>

									{/* Couleur de bordure */}
									<div className="space-y-2">
										<Label className="font-display tracking-wide text-xs">
											{t("display.bg_border_color")}
										</Label>
										<ColorPicker
											value={form.bgBorderColor}
											onChange={(v) => update("bgBorderColor", v)}
										/>
									</div>

									{/* Épaisseur de bordure */}
									<div className="space-y-3">
										<div className="flex justify-between">
											<Label className="font-display tracking-wide text-xs">
												{t("display.bg_border_width")}
											</Label>
											<span className="text-sm text-muted-foreground">{form.bgBorderWidth}px</span>
										</div>
										<Slider
											min={0}
											max={20}
											step={1}
											value={[form.bgBorderWidth]}
											onValueChange={([v]) =>
												update("bgBorderWidth", v ?? DEFAULT_SETTINGS.bgBorderWidth)
											}
										/>
									</div>

									{/* Opacité de bordure */}
									<div className="space-y-3">
										<div className="flex justify-between">
											<Label className="font-display tracking-wide text-xs">
												{t("display.bg_border_opacity")}
											</Label>
											<span className="text-sm text-muted-foreground">{form.bgBorderOpacity}%</span>
										</div>
										<Slider
											min={0}
											max={100}
											step={1}
											value={[form.bgBorderOpacity]}
											onValueChange={([v]) =>
												update("bgBorderOpacity", v ?? DEFAULT_SETTINGS.bgBorderOpacity)
											}
										/>
									</div>
								</div>
							)}
						</div>

						<Separator />

						{/* Types de médias */}
						<div className="space-y-3">
							<Label className="font-display tracking-wide text-xs">
								{t("display.mediaTypes")}
							</Label>
							<ToggleGroup
								type="multiple"
								value={enabledTypesToList(form.enabledTypes)}
								onValueChange={(vals) => update("enabledTypes", listToEnabledTypes(vals))}
								className="flex flex-wrap gap-1.5 justify-start"
							>
								{MEDIA_TYPE_KEYS.map((value) => {
									const Icon = MEDIA_TYPE_ICONS[value];
									return (
										<ToggleGroupItem
											key={value}
											value={value}
											size="sm"
											className="gap-1.5 border-2 border-foreground/30 data-[state=on]:border-foreground data-[state=on]:bg-primary-400 data-[state=on]:text-black data-[state=off]:opacity-50 data-[state=on]:shadow-[2px_2px_0px_0px_var(--nb-shadow)] transition-all font-display text-xs tracking-wide"
										>
											<Icon className="h-3.5 w-3.5" />
											{t(`display.type_${value}`)}
										</ToggleGroupItem>
									);
								})}
							</ToggleGroup>
							<p className="text-xs text-muted-foreground">
								{t("display.mediaTypesCount", {
									count: enabledCount,
									total: MEDIA_TYPE_KEYS.length,
								})}
							</p>
						</div>

						<Separator />

						{/* Save */}
						<Button
							onClick={() => save(form)}
							disabled={!isDirty || isPending}
							className="w-full gap-2 border-2 border-foreground shadow-[3px_3px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.75 active:translate-y-0.75 transition-all font-display tracking-wide disabled:opacity-40 disabled:shadow-none"
						>
							<Save className="h-4 w-4" />
							{isPending ? t("display.saving") : t("display.save")}
						</Button>
					</div>
				</NbCard>
			</div>
		</div>
	);
}
