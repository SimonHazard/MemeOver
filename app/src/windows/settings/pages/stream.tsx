import { NbBadge } from "@memeover/ui/components/branded/nb-badge";
import { Alert, AlertDescription, AlertTitle } from "@memeover/ui/components/ui/alert";
import { NB_SHADOW_LG } from "@memeover/ui/lib/nb-classes";
import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTauriEventVersion } from "@/hooks/useTauriEvent";
import { BrowserSourceCard } from "@/windows/settings/components/stream/browser-source-card";
import { DesktopMuteCard } from "@/windows/settings/components/stream/desktop-mute-card";
import { StreamIssues } from "@/windows/settings/components/stream/stream-issues";

// ─── Component ────────────────────────────────────────────────────────────────

export function StreamPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	// The tray mute writes settings outside React: refresh the cards when it does.
	const settingsVersion = useTauriEventVersion("settings-changed");
	useEffect(() => {
		if (settingsVersion > 0) void queryClient.invalidateQueries({ queryKey: ["settings"] });
	}, [settingsVersion, queryClient]);

	return (
		<div className="p-5">
			<div className="mx-auto max-w-2xl space-y-5">
				<Alert
					role="note"
					className={`border-2 border-foreground bg-secondary-100 dark:bg-secondary-950 ${NB_SHADOW_LG} pr-20 [&>svg]:text-secondary-600 dark:[&>svg]:text-secondary-300`}
				>
					<FlaskConical />
					<AlertTitle className="font-display tracking-wide">{t("stream.beta.title")}</AlertTitle>
					<AlertDescription className="text-foreground/80">
						{t("stream.beta.text")}
					</AlertDescription>
					<NbBadge variant="secondary" className="absolute top-3 right-3">
						{t("stream.beta.badge")}
					</NbBadge>
				</Alert>
				<BrowserSourceCard />
				<DesktopMuteCard />
				<StreamIssues />
			</div>
		</div>
	);
}
