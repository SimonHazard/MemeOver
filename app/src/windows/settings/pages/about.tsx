import { Badge } from "@memeover/ui/components/ui/badge";
import { Button } from "@memeover/ui/components/ui/button";
import { NbCard } from "@memeover/ui/components/ui/card";
import { Separator } from "@memeover/ui/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@memeover/ui/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Bug, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FullscreenInfoDialog } from "@/windows/settings/components/fullscreen-info-dialog";
import { LangToggle } from "@/windows/settings/components/lang-toggle";
import { ThemeToggle } from "@/windows/settings/components/theme-toggle";
import { UpdateChecker } from "@/windows/settings/components/update-checker";

// ─── Component ────────────────────────────────────────────────────────────────

export function AboutPage() {
	const { t } = useTranslation();

	const { data: appVersion } = useQuery({
		queryKey: ["app-version"],
		queryFn: getVersion,
		staleTime: Number.POSITIVE_INFINITY,
	});

	return (
		<div className="p-5">
			<div className="mx-auto max-w-2xl space-y-5">
				{/* ── App identity card ── */}
				<NbCard>
					<div className="flex items-start justify-between">
						<div>
							<h2 className="font-display text-2xl tracking-wide">{t("app.title")}</h2>
							<p className="text-xs text-muted-foreground mt-1 font-text">{t("app.subtitle")}</p>
						</div>
						<div className="flex items-center gap-2 mt-0.5 shrink-0">
							<Badge className="border-2 border-foreground rounded-md font-display text-xs tracking-wide bg-secondary-500 text-white px-2 py-0.5">
								{appVersion ? `v${appVersion}` : "v—"}
							</Badge>
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Badge className="border-2 border-foreground rounded-md font-display text-xs tracking-wide bg-primary text-primary-foreground px-2 py-0.5 cursor-default select-none">
											{t("about.betaTag")}
										</Badge>
									</TooltipTrigger>
									<TooltipContent
										side="bottom"
										className="max-w-55 text-center text-xs leading-snug"
									>
										{t("about.betaDisclaimer")}
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
					</div>
				</NbCard>

				{/* ── Preferences card ── */}
				<NbCard>
					<div className="space-y-4">
						<h2 className="font-display text-base tracking-wide">{t("about.preferences")}</h2>
						<Separator />
						<div className="flex items-center justify-between">
							<span className="text-sm font-text text-foreground">{t("about.language")}</span>
							<LangToggle />
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm font-text text-foreground">{t("about.theme")}</span>
							<ThemeToggle />
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm font-text text-foreground">{t("notice.gaming_compat")}</span>
							<FullscreenInfoDialog />
						</div>
					</div>
				</NbCard>

				{/* ── Bug report card ── */}
				<NbCard>
					<div className="flex items-start gap-4">
						<div className="p-2.5 border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] shrink-0">
							<Bug className="size-5" aria-hidden="true" />
						</div>
						<div className="flex-1 min-w-0 space-y-3">
							<div>
								<h2 className="font-display text-base tracking-wide">
									{t("about.bugReportTitle")}
								</h2>
								<p className="text-sm font-text text-muted-foreground mt-1">
									{t("about.bugReportDesc")}
								</p>
							</div>
							<Button
								size="sm"
								className="border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] font-display"
								onClick={() => openUrl("https://github.com/SimonHazard/MemeOver/issues")}
							>
								<ExternalLink className="size-3.5" aria-hidden="true" />
								{t("about.bugReportButton")}
							</Button>
						</div>
					</div>
				</NbCard>

				{/* ── UpdateChecker ── */}
				<UpdateChecker />
			</div>
		</div>
	);
}
