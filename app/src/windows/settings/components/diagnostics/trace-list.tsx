import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/shared/store";
export function TraceList() {
	const { t, i18n } = useTranslation();
	const trace = useAppStore((s) => s.trace),
		clear = useAppStore((s) => s.clearTrace);
	return (
		<section className="space-y-2">
			<div className="flex items-center justify-between gap-2">
				<h3 className="font-display text-sm">{t("diagnostics.traceTitle")}</h3>
				<NbButton variant="outline" size="sm" disabled={!trace.length} onClick={clear}>
					{t("diagnostics.clear")}
				</NbButton>
			</div>
			{!trace.length ? (
				<p className="text-xs text-muted-foreground">{t("diagnostics.empty")}</p>
			) : (
				<ol className="max-h-64 overflow-y-auto space-y-2" aria-label={t("diagnostics.traceTitle")}>
					{trace.map((entry) => (
						<li key={entry.id} className="border-2 border-border p-2 text-xs space-y-1">
							<div className="flex flex-wrap gap-x-2">
								<time dateTime={new Date(entry.at).toISOString()}>
									{new Date(entry.at).toLocaleTimeString(i18n.language)}
								</time>
								<span>
									{entry.kind}
									{entry.mediaType ? ` / ${entry.mediaType}` : ""}
								</span>
								{entry.author && <span className="truncate max-w-48">{entry.author}</span>}
							</div>
							<span className="inline-block border border-border px-1 font-display">
								{t(`diagnostics.decisions.${entry.decision}`)}
								{entry.reason ? ` · ${t(`diagnostics.reasons.${entry.reason}`)}` : ""}
							</span>
							{entry.detail && <p className="break-words">{entry.detail}</p>}
						</li>
					))}
				</ol>
			)}
		</section>
	);
}
