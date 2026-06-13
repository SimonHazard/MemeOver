import { NbBadge } from "@memeover/ui/components/branded/nb-badge";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { Skeleton } from "@memeover/ui/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import type { ServerCreatorStatus } from "@/shared/server-creator";

export function ServerStatusCard({
	status,
	loading,
	wsPort,
}: {
	status?: ServerCreatorStatus;
	loading: boolean;
	wsPort: number;
}) {
	const { t } = useTranslation();

	return (
		<NbCard>
			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-between gap-3">
					<h2 className="font-display text-sm tracking-wide">{t("server.status.title")}</h2>
					{loading && <Skeleton className="h-5 w-14" />}
				</div>
				<div className="grid grid-cols-2 gap-2 text-xs">
					<NbBadge variant={status?.bunAvailable ? "default" : "outline"}>
						Bun {status?.bunAvailable ? t("server.status.ok") : t("server.status.missing")}
					</NbBadge>
					<NbBadge variant={status?.gitAvailable ? "default" : "outline"}>
						Git {status?.gitAvailable ? t("server.status.ok") : t("server.status.missing")}
					</NbBadge>
					<NbBadge variant={status?.installed ? "default" : "outline"}>
						{status?.installed ? t("server.status.installed") : t("server.status.notInstalled")}
					</NbBadge>
					<NbBadge variant={status?.configured ? "default" : "outline"}>
						{status?.configured ? t("server.status.configured") : t("server.status.notConfigured")}
					</NbBadge>
				</div>
				<p className="break-all font-mono text-xs text-muted-foreground">
					{status?.localWsUrl ?? `ws://localhost:${wsPort}/ws`}
				</p>
			</div>
		</NbCard>
	);
}
