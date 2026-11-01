import { NB_BADGE, NB_SHADOW_SM } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/shared/store";
import { obsPreviewStatus } from "./obs-browser";

const CONNECTED_VISIBLE_MS = 3000;

/** Browser preview aid only: ObsApp never renders it inside OBS, so it is never on stream. */
export function ObsStatusPill() {
	const { t } = useTranslation();
	const wsStatus = useAppStore((s) => s.wsStatus);
	const revoked = useAppStore((s) => s.wsRevokedReason);
	const status = obsPreviewStatus(wsStatus, revoked);
	const [hidden, setHidden] = useState(false);

	useEffect(() => {
		setHidden(false);
		if (status !== "connected") return;
		const timer = setTimeout(() => setHidden(true), CONNECTED_VISIBLE_MS);
		return () => clearTimeout(timer);
	}, [status]);

	if (hidden) return null;
	return (
		<div
			role="status"
			className={cn(
				NB_BADGE,
				NB_SHADOW_SM,
				"fixed bottom-4 left-4 bg-background px-3 py-1.5 text-foreground",
				status === "revoked" && "bg-destructive text-white",
			)}
		>
			{t(`obs.status.${status}`)}
		</div>
	);
}
