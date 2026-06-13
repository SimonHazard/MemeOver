import { NbBadge } from "@memeover/ui/components/branded/nb-badge";
import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { Alert, AlertDescription } from "@memeover/ui/components/ui/alert";
import { Separator } from "@memeover/ui/components/ui/separator";
import { Hammer, RefreshCw, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ServerCreatorStatus } from "@/shared/server-creator";

export function ServerInstallCard({
	status,
	installDisabled,
	installPending,
	installBunPending,
	onInstallBun,
	onInstall,
	onRepair,
}: {
	status?: ServerCreatorStatus;
	installDisabled: boolean;
	installPending: boolean;
	installBunPending: boolean;
	onInstallBun: () => void;
	onInstall: () => void;
	onRepair: () => void;
}) {
	const { t } = useTranslation();

	return (
		<NbCard>
			<div className="flex flex-col gap-4">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 className="font-display text-base tracking-wide">{t("server.install.title")}</h2>
						<p className="mt-1 font-text text-sm text-muted-foreground">
							{t("server.install.desc")}
						</p>
					</div>
					<NbBadge variant={status?.installed ? "default" : "outline"}>
						{status?.installed ? t("server.status.installed") : t("server.status.notInstalled")}
					</NbBadge>
				</div>
				<Separator />
				<div className="flex flex-wrap gap-2">
					<NbButton
						variant="outline"
						disabled={status?.bunAvailable || installBunPending}
						onClick={onInstallBun}
					>
						<Wrench className="size-4" aria-hidden="true" />
						{status?.bunAvailable ? t("server.install.bunReady") : t("server.install.bun")}
					</NbButton>
					<NbButton disabled={installDisabled} onClick={onInstall}>
						<Hammer className="size-4" aria-hidden="true" />
						{installPending ? t("server.install.installing") : t("server.install.install")}
					</NbButton>
					<NbButton
						variant="outline"
						disabled={!status?.installed || installPending}
						onClick={onRepair}
					>
						<RefreshCw className="size-4" aria-hidden="true" />
						{t("server.install.repair")}
					</NbButton>
				</div>
				{!status?.gitAvailable && (
					<Alert variant="destructive">
						<AlertDescription>{t("server.install.gitMissing")}</AlertDescription>
					</Alert>
				)}
				<p className="font-text text-xs text-muted-foreground">
					{t("server.install.securityNote")}
				</p>
			</div>
		</NbCard>
	);
}
