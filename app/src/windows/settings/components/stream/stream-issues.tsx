import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { Separator } from "@memeover/ui/components/ui/separator";
import { NB_SHADOW_SM } from "@memeover/ui/lib/nb-classes";
import { Lightbulb, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";

const ISSUES = ["video", "fullscreen", "mixed", "isolate"] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function StreamIssues() {
	const { t } = useTranslation();

	return (
		<NbCard>
			<div className="space-y-4">
				<div className="flex items-start gap-4">
					<div className={`p-2.5 border-2 border-foreground ${NB_SHADOW_SM} shrink-0`}>
						<Radio className="size-5" aria-hidden="true" />
					</div>
					<div>
						<h2 className="font-display text-base tracking-wide">{t("stream.issues.title")}</h2>
						<p className="text-sm font-text text-muted-foreground mt-1">
							{t("stream.issues.desc")}
						</p>
					</div>
				</div>

				<Separator />

				{ISSUES.map((issue) => (
					<section key={issue} className="space-y-1.5">
						<h3 className="font-display text-sm tracking-wide">
							{t(`stream.issues.${issue}Title`)}
						</h3>
						<p className="text-sm font-text text-muted-foreground">
							{t(`stream.issues.${issue}Problem`)}
						</p>
						<p className="flex gap-2 text-sm font-text">
							<Lightbulb className="size-3.5 shrink-0 mt-1" aria-hidden="true" />
							<span>
								<strong>{t("stream.issues.hintLabel")}</strong> {t(`stream.issues.${issue}Hint`)}
							</span>
						</p>
					</section>
				))}

				<Separator />

				<p className="text-sm font-text">{t("stream.issues.testTip")}</p>
			</div>
		</NbCard>
	);
}
