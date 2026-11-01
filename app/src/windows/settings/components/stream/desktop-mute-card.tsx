import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TriangleAlert, Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { loadSettings } from "@/shared/settings";
import { setDesktopOverlayMuted } from "@/shared/stream-controls";

/** One action, mirrored by the tray's "Mute overlay" item. No motion: it is a frequent toggle. */
export function DesktopMuteCard() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: loadSettings });
	const { mutate, isPending } = useMutation({
		mutationFn: (muted: boolean) => setDesktopOverlayMuted(muted),
		onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["settings"] }),
		onError: () => toast.error(t("toast.settingsError")),
	});
	if (!settings) return null;

	const muted = settings.desktopOverlayMuted;
	const Icon = muted ? VolumeX : Volume2;

	return (
		<NbCard>
			<div className="space-y-3">
				<div>
					<h2 className="font-display text-base tracking-wide">{t("stream.desktopMute.title")}</h2>
					<p className="text-sm font-text text-muted-foreground mt-1">
						{t("stream.desktopMute.desc")}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<NbButton
						size="lg"
						variant={muted ? "default" : "outline"}
						aria-pressed={muted}
						disabled={isPending}
						onClick={() => mutate(!muted)}
					>
						<Icon className="size-5" aria-hidden="true" />
						{t(muted ? "stream.desktopMute.unmute" : "stream.desktopMute.mute")}
					</NbButton>
					<p role="status" className="text-sm font-text">
						{t(muted ? "stream.desktopMute.stateMuted" : "stream.desktopMute.stateAudible")}
					</p>
				</div>
				{settings.obsSourceEnabled && !muted && (
					<p className="flex gap-2 text-xs font-text text-muted-foreground">
						<TriangleAlert className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
						{t("stream.desktopMute.doubleHint")}
					</p>
				)}
			</div>
		</NbCard>
	);
}
