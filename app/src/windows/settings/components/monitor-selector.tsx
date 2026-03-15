import { Label } from "@memeover/ui/components/ui/label";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@memeover/ui/components/ui/tooltip";
import { NB_BTN_DISABLED, NB_BTN_SM } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Monitor } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { moveOverlayToMonitor, sameMonitorPosition } from "@/shared/helpers";
import { useAvailableMonitors } from "@/shared/hooks/useAvailableMonitors";
import { loadSettings, persistSettings } from "@/shared/settings";

export function MonitorSelector() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const monitors = useAvailableMonitors();
	const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: loadSettings });
	const [pending, setPending] = useState<number | null>(null);

	// Hide when there's only one screen — no choice to make
	if (monitors.length <= 1) return null;

	// True when the saved monitor is no longer in the connected list.
	const savedMonitor = settings?.overlayMonitor ?? null;
	const savedMonitorDisconnected =
		!!savedMonitor && !monitors.some((m) => sameMonitorPosition(m.position, savedMonitor));

	const isActive = (index: number) => {
		const m = monitors[index];
		if (!m) return false;
		// No saved preference, or saved monitor is gone → OS put overlay on primary.
		if (!savedMonitor || savedMonitorDisconnected) {
			return m.isPrimary;
		}
		return sameMonitorPosition(m.position, savedMonitor);
	};

	const handleSelect = async (index: number) => {
		// Guard: already on this monitor — avoid a pointless hide/move/show cycle.
		if (isActive(index)) return;
		if (pending !== null) return;
		const monitor = monitors[index];
		if (!monitor) return;
		setPending(index);
		try {
			// Always read the latest persisted settings before merging — same pattern
			// as the form's mutationFn — so no other field gets accidentally reset.
			const current = await queryClient.fetchQuery({
				queryKey: ["settings"],
				queryFn: loadSettings,
			});
			const identifier = await moveOverlayToMonitor(index, monitor.position);
			if (identifier) {
				await persistSettings({ ...current, overlayMonitor: identifier });
				void queryClient.invalidateQueries({ queryKey: ["settings"] });
				const label = monitor.name ?? t("display.monitor_screen", { number: index + 1 });
				toast.success(t("toast.monitorSwitched", { name: label }));
			} else {
				toast.error(t("toast.monitorError"));
			}
		} finally {
			setPending(null);
		}
	};

	return (
		<div className="space-y-3">
			<div className="space-y-0.5">
				<div className="flex items-center gap-1.5">
					<Label className="font-display tracking-wide text-xs">{t("display.monitor")}</Label>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Info className="h-3 w-3 text-muted-foreground shrink-0 cursor-default" />
							</TooltipTrigger>
							<TooltipContent side="right" className="max-w-56">
								{t("display.monitor_beta")}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
				<p className="text-xs text-muted-foreground">{t("display.monitor_hint")}</p>
			</div>

			<div className="flex flex-wrap gap-2">
				{monitors.map((monitor, index) => {
					const active = isActive(index);
					const loading = pending === index;
					const isDisabled = loading || pending !== null;
					const label = monitor.name ?? t("display.monitor_screen", { number: index + 1 });
					const res = `${monitor.logicalSize.width}x${monitor.logicalSize.height}`;

					return (
						<button
							key={`${monitor.position.x},${monitor.position.y}`}
							type="button"
							onClick={() => void handleSelect(index)}
							disabled={isDisabled}
							className={cn(
								NB_BTN_SM,
								"flex items-center gap-1.5 px-3 py-1.5 rounded-none transition-none",
								active
									? "bg-foreground text-background shadow-nb-sm"
									: "bg-background text-foreground",
								NB_BTN_DISABLED,
							)}
						>
							<Monitor className="h-3 w-3 shrink-0" />
							<span className="truncate max-w-30">{label}</span>
							{monitor.isPrimary && (
								<span className="text-[9px] opacity-50 shrink-0 uppercase tracking-wider">
									{t("display.monitor_primary")}
								</span>
							)}
							<span className="text-[10px] opacity-60 shrink-0">{res}</span>
						</button>
					);
				})}
			</div>

			{savedMonitorDisconnected && (
				<p className="text-xs text-amber-500">{t("display.monitor_disconnected")}</p>
			)}
		</div>
	);
}
