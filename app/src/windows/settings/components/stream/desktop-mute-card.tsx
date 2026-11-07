import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { NbSwitch } from "@memeover/ui/components/branded/nb-switch";
import { Label } from "@memeover/ui/components/ui/label";
import { NB_SHADOW_SM } from "@memeover/ui/lib/nb-classes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, TriangleAlert, Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { loadSettings } from "@/shared/settings";
import { setDesktopOverlayMuted } from "@/shared/stream-controls";
import { desktopPlaybackEnabled } from "@/shared/stream-destination";

/** One switch, mirrored by the tray's "Mute overlay" check item. No motion: it is a frequent toggle. */
export function DesktopMuteCard() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	// Always refetch on mount: the tray may have changed the mute while another tab was open.
	const { data: settings } = useQuery({
		queryKey: ["settings"],
		queryFn: loadSettings,
		staleTime: 0,
	});
	const { mutate, isPending } = useMutation({
		mutationFn: (muted: boolean) => setDesktopOverlayMuted(muted),
		onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["settings"] }),
		onError: () => toast.error(t("toast.settingsError")),
	});
	if (!settings) return null;

	const muted = settings.desktopOverlayMuted;
	const desktopHidden = !desktopPlaybackEnabled(settings);
	const Icon = muted ? VolumeX : Volume2;

	return (
		<NbCard>
			<div className="space-y-3">
				<div className="flex items-start gap-4">
					<div className={`p-2.5 border-2 border-foreground ${NB_SHADOW_SM} shrink-0`}>
						<Icon className="size-5" aria-hidden="true" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-start justify-between gap-4">
							<h2 className="font-display text-base tracking-wide">
								<Label htmlFor="desktop-overlay-muted">{t("stream.desktopMute.title")}</Label>
							</h2>
							<NbSwitch
								id="desktop-overlay-muted"
								checked={muted}
								disabled={isPending}
								onCheckedChange={(checked) => mutate(checked)}
							/>
						</div>
						<p className="text-sm font-text text-muted-foreground mt-1">
							{t("stream.desktopMute.desc")}
						</p>
					</div>
				</div>
				{desktopHidden ? (
					<p role="status" className="flex gap-2 text-xs font-text text-muted-foreground">
						<Info className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
						{t("stream.desktopMute.stateHidden")}
					</p>
				) : (
					settings.browserSourceEnabled &&
					!muted && (
						<p className="flex gap-2 text-xs font-text text-muted-foreground">
							<TriangleAlert className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
							{t("stream.desktopMute.doubleHint")}
						</p>
					)
				)}
			</div>
		</NbCard>
	);
}
