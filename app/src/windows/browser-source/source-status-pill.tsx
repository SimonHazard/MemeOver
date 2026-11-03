import { NB_BADGE, NB_SHADOW_SM } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/shared/store";
import { sourcePreviewStatus } from "./source-environment";

const CONNECTED_VISIBLE_MS = 3000;

/** Browser preview aid only: never rendered where sound plays without a gesture. */
export function SourceStatusPill({ sourceStopped }: { sourceStopped: boolean }) {
	const { t } = useTranslation();
	const wsStatus = useAppStore((s) => s.wsStatus);
	const revoked = useAppStore((s) => s.wsRevokedReason);
	const joinRejected = useAppStore((s) => s.wsJoinRejected);
	const status = sourceStopped ? "stopped" : sourcePreviewStatus(wsStatus, revoked, joinRejected);
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
				(status === "revoked" || status === "rejected" || status === "stopped") &&
					"bg-destructive text-white",
			)}
		>
			{t(`browserSource.status.${status}`)}
		</div>
	);
}
