import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	ArrowLeft,
	Clapperboard,
	FileAudio,
	ImageIcon,
	MessageSquare,
	Save,
	Video,
} from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { loadSettings, persistSettings } from "@/shared/settings";
import type { EnabledTypes, Settings } from "@/shared/types";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { PositionGrid } from "../position-grid";
import { PositionPreview } from "../position-preview";

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaSettingsFields = Pick<
	Settings,
	"mediaSize" | "duration" | "volume" | "position" | "enabledTypes"
>;

interface MediaSettingsFormProps {
	initialData: Settings;
	onBack: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MEDIA_TYPE_KEYS = ["image", "gif", "video", "audio", "text"] as const;

const MEDIA_TYPE_ICONS = {
	image: ImageIcon,
	gif: Clapperboard,
	video: Video,
	audio: FileAudio,
	text: MessageSquare,
} as const;

function enabledTypesToList(et: EnabledTypes): string[] {
	return MEDIA_TYPE_KEYS.filter((k) => et[k]);
}

function listToEnabledTypes(list: string[]): EnabledTypes {
	const result: EnabledTypes = {
		image: false,
		gif: false,
		video: false,
		audio: false,
		text: false,
	};
	for (const v of list) {
		if (v in result) result[v as keyof EnabledTypes] = true;
	}
	return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MediaSettingsForm({ initialData, onBack }: MediaSettingsFormProps) {
	const queryClient = useQueryClient();
	const { t } = useTranslation();

	const [form, setForm] = useState<MediaSettingsFields>({
		mediaSize: initialData.mediaSize,
		duration: initialData.duration,
		volume: initialData.volume,
		position: initialData.position,
		enabledTypes: initialData.enabledTypes,
	});

	const snapshotRef = useRef<MediaSettingsFields>({
		mediaSize: initialData.mediaSize,
		duration: initialData.duration,
		volume: initialData.volume,
		position: initialData.position,
		enabledTypes: initialData.enabledTypes,
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

	const enabledCount = enabledTypesToList(form.enabledTypes).length;

	return (
		<div className="p-6">
			<div className="mx-auto max-w-2xl space-y-6">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
						<ArrowLeft className="h-4 w-4" />
						{t("display.back")}
					</Button>
					<h1 className="text-2xl font-bold tracking-tight">{t("display.title")}</h1>
				</div>

				<Card className="p-6">
					<div className="space-y-6">
						<h2 className="text-lg font-semibold">{t("display.settings")}</h2>

						<Separator />

						{/* Taille */}
						<div className="space-y-3">
							<div className="flex justify-between">
								<Label>{t("display.size")}</Label>
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
								<Label>{t("display.duration")}</Label>
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

						{/* Volume */}
						<div className="space-y-3">
							<div className="flex justify-between">
								<Label>{t("display.volume")}</Label>
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

						{/* Position */}
						<div className="space-y-3">
							<Label>{t("display.position")}</Label>
							<PositionGrid value={form.position} onChange={(v) => update("position", v)} />
						</div>

						{/* Aperçu de position */}
						<div className="space-y-2">
							<Label className="text-muted-foreground text-xs">{t("display.preview")}</Label>
							<PositionPreview
								position={form.position}
								mediaSize={form.mediaSize}
								label={t("display.preview_media")}
							/>
						</div>

						<Separator />

						{/* Types de médias (7.2 — UX améliorée) */}
						<div className="space-y-3">
							<Label>{t("display.mediaTypes")}</Label>
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
											className="gap-1.5 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=off]:opacity-40"
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

						{/* Save explicite */}
						<Button
							onClick={() => save(form)}
							disabled={!isDirty || isPending}
							className="w-full gap-2"
						>
							<Save className="h-4 w-4" />
							{isPending ? t("display.saving") : t("display.save")}
						</Button>
					</div>
				</Card>
			</div>
		</div>
	);
}
