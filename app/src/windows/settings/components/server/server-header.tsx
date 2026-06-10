import { Progress } from "@memeover/ui/components/ui/progress";
import { Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ServerCreatorStatus } from "@/shared/server-creator";
import { StatusBadge } from "./status-badge";

export function ServerHeader({
	status,
	progress,
}: {
	status?: ServerCreatorStatus;
	progress: number;
}) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<Server className="size-6" aria-hidden="true" />
					<h1 className="font-display text-2xl tracking-wide">{t("server.title")}</h1>
					<StatusBadge status={status} />
				</div>
				<p className="max-w-3xl font-text text-sm text-muted-foreground">{t("server.subtitle")}</p>
			</div>
			<div className="min-w-56">
				<Progress value={progress} />
			</div>
		</div>
	);
}
