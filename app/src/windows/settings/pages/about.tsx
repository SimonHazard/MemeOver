import { useQuery } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { NbCard } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
						<Badge className="border-2 border-foreground rounded-md font-display text-xs tracking-wide bg-secondary-500 text-white px-2 py-0.5 shrink-0 mt-0.5">
							{appVersion ? `v${appVersion}` : "v—"}
						</Badge>
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
					</div>
				</NbCard>

				{/* ── UpdateChecker ── */}
				<UpdateChecker />
			</div>
		</div>
	);
}
