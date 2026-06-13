import { NbBadge } from "@memeover/ui/components/branded/nb-badge";
import { useTranslation } from "react-i18next";
import type { ServerCreatorStatus } from "@/shared/server-creator";

export function StatusBadge({ status }: { status?: ServerCreatorStatus }) {
	const { t } = useTranslation();
	if (!status) return <NbBadge variant="outline">...</NbBadge>;
	if (status.healthy) return <NbBadge variant="secondary">{t("server.status.portOpen")}</NbBadge>;
	if (status.running) return <NbBadge variant="default">{t("server.status.running")}</NbBadge>;
	return <NbBadge variant="outline">{t("server.status.stopped")}</NbBadge>;
}
