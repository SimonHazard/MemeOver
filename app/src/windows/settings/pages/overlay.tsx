import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clapperboard, FileAudio, ImageIcon, MessageSquare, Save, Video } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NbCard } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
	clearQueue,
	overlayHealthVariant,
	quitOverlay,
	reloadOverlay,
	showOverlay,
} from "@/shared/helpers";
import { loadSettings, persistSettings } from "@/shared/settings";
import { useAppStore } from "@/shared/store";
import type { EnabledTypes, Settings } from "@/shared/types";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { PositionGrid } from "../components/position-grid";
import { PositionPreview } from "../components/position-preview";

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaSettingsFields = Pick<
	Settings,
	"mediaSize" | "duration" | "volume" | "position" | "enabledTypes"
>;

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function OverlayPage() {
	const { data: saved, isLoading } = useQuery({
		queryKey: ["settings"],
		queryFn: loadSettings,
	});

	if (isLoading) {
		return (
			<div className="p-5">
				<div className="mx-auto max-w-xl space-y-5">
					<Skeleton className="h-36 w-full rounded-xl" />
					<Skeleton className="h-96 w-full rounded-xl" />
				</div>
			</div>
		);
	}

	return <OverlaySettingsContent initialData={saved ?? DEFAULT_SETTINGS} />;
}

// ─── Content (requires loaded data) ──────────────────────────────────────────

function OverlaySettingsContent({ initialData }: { initialData: Settings }) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const overlayHealth = useAppStore((s) => s.overlayHealth);
	const queueSize = useAppStore((s) => s.queueSize);
	const overlayAlive = overlayHealth === "alive";

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
