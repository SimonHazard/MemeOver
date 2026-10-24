import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { Badge } from "@memeover/ui/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@memeover/ui/components/ui/toggle-group";
import { NB_TOGGLE_ITEM } from "@memeover/ui/lib/nb-classes";
import { emit } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAppStore } from "@/shared/store";
import { listenDevEvent } from "./events";
import {
	DEV_OVERLAY_COMMAND,
	DEV_OVERLAY_STATE,
	INITIAL_SIMULATION,
	type OverlaySimulation,
	type SimulationCommand,
} from "./overlay-simulation";

export default function OverlayTestControls() {
	const { t } = useTranslation();
	const alive = useAppStore((s) => s.overlayHealth === "alive");
	const [state, setState] = useState(INITIAL_SIMULATION);
	const [ready, setReady] = useState(false);
	useEffect(
		() =>
			listenDevEvent<OverlaySimulation>(
				DEV_OVERLAY_STATE,
				(snapshot) => {
					setState(snapshot);
					setReady(true);
				},
				() => emit(DEV_OVERLAY_COMMAND, { type: "read" } satisfies SimulationCommand),
			),
		[],
	);
	function send(command: SimulationCommand) {
		void emit(DEV_OVERLAY_COMMAND, command).catch(() => toast.error(t("devOverlay.error")));
	}
	const disabled = !ready || !alive;
	return (
		<NbCard>
			<div className="flex flex-col gap-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<h2 className="font-display text-base tracking-wide">{t("devOverlay.title")}</h2>
						<Badge variant="secondary">DEV</Badge>
					</div>
					<NbButton
						type="button"
						variant={state.enabled ? "default" : "outline"}
						size="sm"
						disabled={disabled}
						onClick={() => send({ type: state.enabled ? "stop" : "start" })}
					>
						{t(state.enabled ? "devOverlay.stop" : "devOverlay.start")}
					</NbButton>
				</div>
				<p className="text-sm text-muted-foreground">{t("devOverlay.hint")}</p>
				{!alive && <p className="text-sm text-muted-foreground">{t("devOverlay.showFirst")}</p>}
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p aria-live="polite" className="text-sm">
						{t("devOverlay.peers", { count: state.peers })}
					</p>
					<div className="flex flex-wrap gap-2">
						<NbButton
							type="button"
							size="sm"
							variant="outline"
							disabled={disabled || !state.enabled}
							onClick={() => send({ type: "join" })}
						>
							{t("devOverlay.join")}
						</NbButton>
						<NbButton
							type="button"
							size="sm"
							variant="outline"
							disabled={disabled || !state.enabled || state.peers === 0}
							onClick={() => send({ type: "leave" })}
						>
							{t("devOverlay.leave")}
						</NbButton>
					</div>
				</div>
				<ToggleGroup
					aria-label={t("devOverlay.media")}
					value={[state.media]}
					disabled={disabled || !state.enabled}
					onValueChange={([media]) => {
						if (media === "image" || media === "text" || media === "none")
							send({ type: "media", media });
					}}
				>
					{(["image", "text", "none"] as const).map((media) => (
						<ToggleGroupItem key={media} value={media} className={NB_TOGGLE_ITEM}>
							{t(`devOverlay.${media}`)}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</div>
		</NbCard>
	);
}
