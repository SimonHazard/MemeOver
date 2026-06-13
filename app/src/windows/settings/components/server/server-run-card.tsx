import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { Separator } from "@memeover/ui/components/ui/separator";
import { Play, RefreshCw, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ServerCreatorStatus } from "@/shared/server-creator";
import { StatusBadge } from "./status-badge";

export function ServerRunCard({
	status,
	wsPort,
	startPending,
	stopPending,
	restartPending,
	onStart,
	onStop,
	onRestart,
}: {
	status?: ServerCreatorStatus;
	wsPort: number;
	startPending: boolean;
	stopPending: boolean;
	restartPending: boolean;
	onStart: () => void;
	onStop: () => void;
	onRestart: () => void;
}) {
	const { t } = useTranslation();

	return (
		<NbCard>
			<div className="flex flex-col gap-4">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 className="font-display text-base tracking-wide">{t("server.run.title")}</h2>
						<p className="mt-1 font-text text-sm text-muted-foreground">{t("server.run.desc")}</p>
					</div>
					<StatusBadge status={status} />
				</div>
				<Separator />
				<div className="flex flex-wrap gap-2">
					<NbButton
						disabled={!status?.installed || !!status?.running || !!status?.healthy || startPending}
						onClick={onStart}
					>
						<Play className="size-4" aria-hidden="true" />
						{t("server.run.start")}
					</NbButton>
					<NbButton variant="outline" disabled={!status?.running || stopPending} onClick={onStop}>
						<Square className="size-4" aria-hidden="true" />
						{t("server.run.stop")}
					</NbButton>
					<NbButton
						variant="outline"
						disabled={!status?.installed || restartPending}
						onClick={onRestart}
					>
						<RefreshCw className="size-4" aria-hidden="true" />
						{t("server.run.restart")}
					</NbButton>
				</div>
				<p className="break-all font-mono text-xs text-muted-foreground">
					{status?.healthUrl ?? `http://localhost:${wsPort}/health`}
				</p>
			</div>
		</NbCard>
	);
}
