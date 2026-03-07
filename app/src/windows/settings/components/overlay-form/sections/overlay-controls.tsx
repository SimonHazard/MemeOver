import { Badge } from "@memeover/ui/components/ui/badge";
import { Button } from "@memeover/ui/components/ui/button";
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

const NB_BTN_BASE =
	"border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all font-display tracking-wide text-xs";
const NB_BTN = `w-full ${NB_BTN_BASE}`;
const NB_BTN_DISABLED = "disabled:opacity-40 disabled:shadow-none";

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
				<Badge
					variant={overlayHealthVariant(overlayHealth)}
					className="border-2 border-foreground rounded-md font-display text-xs tracking-wide px-2 py-0.5"
				>
					{t(`health.${overlayHealth}`)}
				</Badge>
			</div>

			<Separator />

			<div className="grid grid-cols-3 gap-2">
				<Button variant="outline" className={NB_BTN} onClick={() => void showOverlay()}>
					{t("overlay.show")}
				</Button>
				<Button
					variant="outline"
					className={cn(NB_BTN, NB_BTN_DISABLED)}
					disabled={!overlayAlive}
					onClick={() => void reloadOverlay()}
				>
					{t("overlay.reload")}
				</Button>
				<Button
					variant="destructive"
					className={cn(NB_BTN, NB_BTN_DISABLED)}
					disabled={!overlayAlive}
					onClick={() => void quitOverlay()}
				>
					{t("overlay.close")}
				</Button>
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
						<Button
							variant={devPreviewActive ? "default" : "outline"}
							size="sm"
							className={cn(
								NB_BTN_BASE,
								"gap-1.5",
								devPreviewActive && "bg-primary-400 text-black hover:bg-primary-500",
							)}
							onClick={() => void handleToggleDevPreview()}
						>
							{devPreviewActive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
							{devPreviewActive ? t("overlay.dev_preview_exit") : t("overlay.dev_preview_enter")}
						</Button>
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
				<Button
					variant="outline"
					size="sm"
					className={NB_BTN_BASE}
					onClick={() => void clearQueue()}
				>
					{t("actions.clearQueue")}
				</Button>
			</div>
		</div>
	);
}
