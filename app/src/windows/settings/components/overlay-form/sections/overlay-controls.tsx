import { NbBadge } from "@memeover/ui/components/branded/nb-badge";
import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { Badge } from "@memeover/ui/components/ui/badge";
import { Separator } from "@memeover/ui/components/ui/separator";
import { cn } from "@memeover/ui/lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	clearQueue,
	overlayHealthVariant,
	quitOverlay,
	reloadOverlay,
	showOverlay,
} from "@/shared/helpers";
import { useAppStore } from "@/shared/store";

export function OverlayControls() {
	const { t } = useTranslation();
	const overlayHealth = useAppStore((s) => s.overlayHealth);
	const queueSize = useAppStore((s) => s.queueSize);
	const overlayAlive = overlayHealth === "alive";

	const [devPreviewActive, setDevPreviewActive] = useState(false);

	async function handleToggleDevPreview() {
		const next = !devPreviewActive;
		await invoke("toggle_overlay_preview_mode", { enabled: next });
		setDevPreviewActive(next);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="font-display text-base tracking-wide">{t("overlay.controls")}</h2>
				<NbBadge variant={overlayHealthVariant(overlayHealth)} className="px-2 py-0.5">
					{t(`health.${overlayHealth}`)}
				</NbBadge>
			</div>

			<Separator />

			<div className="grid grid-cols-3 gap-2">
				<NbButton variant="outline" className="w-full" onClick={() => void showOverlay()}>
					{t("overlay.show")}
				</NbButton>
				<NbButton
					variant="outline"
					className="w-full"
					disabled={!overlayAlive}
					onClick={() => void reloadOverlay()}
				>
					{t("overlay.reload")}
				</NbButton>
				<NbButton
					variant="destructive"
					className="w-full"
					disabled={!overlayAlive}
					onClick={() => void quitOverlay()}
				>
					{t("overlay.close")}
				</NbButton>
			</div>

			<Separator />

			{import.meta.env.DEV && (
				<>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="font-display text-sm tracking-wide">{t("overlay.dev_preview")}</span>
							<Badge
								variant="secondary"
								className="border border-foreground rounded-md text-xs font-mono"
							>
								DEV
							</Badge>
						</div>
						<NbButton
							variant={devPreviewActive ? "default" : "outline"}
							size="sm"
							className={cn(
								"gap-1.5",
								devPreviewActive && "bg-primary-400 text-primary-foreground hover:bg-primary-500",
							)}
							onClick={() => void handleToggleDevPreview()}
						>
							{devPreviewActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
							{devPreviewActive ? t("overlay.dev_preview_exit") : t("overlay.dev_preview_enter")}
						</NbButton>
					</div>
					<Separator />
				</>
			)}

			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="font-display text-sm tracking-wide">{t("actions.clearQueue")}</span>
					{queueSize > 0 && (
						<Badge variant="secondary" className="border border-foreground rounded-md text-xs">
							{t("actions.queueSize", { count: queueSize })}
						</Badge>
					)}
				</div>
				<NbButton variant="outline" size="sm" onClick={() => void clearQueue()}>
					{t("actions.clearQueue")}
				</NbButton>
			</div>
		</div>
	);
}
