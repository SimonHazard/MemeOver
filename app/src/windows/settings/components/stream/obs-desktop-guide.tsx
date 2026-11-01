import {
	NbAccordion,
	NbAccordionContent,
	NbAccordionItem,
	NbAccordionTrigger,
} from "@memeover/ui/components/branded/nb-accordion";
import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { Separator } from "@memeover/ui/components/ui/separator";
import { NB_SHADOW_SM } from "@memeover/ui/lib/nb-classes";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, Radio, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CopyButton } from "@/components/motion/copy-button";
import {
	APP_CAPTURE_VERIFIED,
	guideAudioRoutes,
	OBS_APP_AUDIO_CAPTURE_GUIDE_URL,
	OBS_OVERLAY_WINDOW_TITLE,
	VB_CABLE_URL,
} from "@/shared/stream-guide";

const SHOW_CABLE_ROUTE = guideAudioRoutes(APP_CAPTURE_VERIFIED).includes("virtual-cable");

// ─── Sub-components ───────────────────────────────────────────────────────────

function Steps({ items }: { items: string[] }) {
	return (
		<ol className="space-y-2.5">
			{items.map((text, index) => (
				<li key={text} className="flex gap-3 text-sm font-text leading-relaxed">
					<span
						aria-hidden="true"
						className="flex size-6 shrink-0 items-center justify-center rounded-md border-2 border-foreground bg-primary-400 font-display text-xs text-primary-foreground"
					>
						{index + 1}
					</span>
					<span className="pt-0.5">{text}</span>
				</li>
			))}
		</ol>
	);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ObsDesktopGuide() {
	const { t } = useTranslation();

	return (
		<NbCard>
			<div className="space-y-4">
				<div className="flex items-start gap-4">
					<div className={`p-2.5 border-2 border-foreground ${NB_SHADOW_SM} shrink-0`}>
						<Radio className="size-5" aria-hidden="true" />
					</div>
					<div>
						<h2 className="font-display text-base tracking-wide">{t("stream.desktop.title")}</h2>
						<p className="text-sm font-text text-muted-foreground mt-1">
							{t("stream.desktop.desc")}
						</p>
					</div>
				</div>

				<Separator />

				<section className="space-y-3">
					<h3 className="font-display text-sm tracking-wide">{t("stream.desktop.quickTitle")}</h3>
					<Steps
						items={[
							t("stream.desktop.quickVideo"),
							t("stream.desktop.quickAudio"),
							t("stream.desktop.quickGameCapture"),
						]}
					/>
				</section>

				{SHOW_CABLE_ROUTE && (
					<NbAccordion>
						<NbAccordionItem value="virtual-cable">
							<NbAccordionTrigger>{t("stream.desktop.cableTitle")}</NbAccordionTrigger>
							<NbAccordionContent>
								<div className="space-y-3">
									<p className="text-sm font-text text-muted-foreground">
										{t("stream.desktop.cableIntro")}
									</p>
									<Steps
										items={[
											t("stream.desktop.cableInstall"),
											t("stream.desktop.cableDisableDesktop"),
											t("stream.desktop.cableMixer"),
											t("stream.desktop.cableObsInput"),
											t("stream.desktop.cableMonitorDevice"),
											t("stream.desktop.cableMonitor"),
										]}
									/>
									<p className="flex gap-2 text-xs font-text text-muted-foreground">
										<TriangleAlert className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
										{t("stream.desktop.cableWarning")}
									</p>
									<div className="flex flex-wrap gap-2">
										<NbButton size="sm" variant="outline" onClick={() => openUrl(VB_CABLE_URL)}>
											<ExternalLink className="size-3.5" aria-hidden="true" />
											{t("stream.desktop.cableDownload")}
										</NbButton>
										<NbButton
											size="sm"
											variant="outline"
											onClick={() => openUrl(OBS_APP_AUDIO_CAPTURE_GUIDE_URL)}
										>
											<ExternalLink className="size-3.5" aria-hidden="true" />
											{t("stream.desktop.obsGuide")}
										</NbButton>
									</div>
								</div>
							</NbAccordionContent>
						</NbAccordionItem>
					</NbAccordion>
				)}

				<Separator />

				<div className="space-y-3">
					<p className="text-xs font-text text-muted-foreground">
						{t("stream.desktop.otherPlatforms")}
					</p>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="text-sm font-text">
							<p className="text-xs text-muted-foreground">{t("stream.desktop.windowName")}</p>
							<code className="font-mono">{OBS_OVERLAY_WINDOW_TITLE}</code>
						</div>
						<CopyButton
							value={OBS_OVERLAY_WINDOW_TITLE}
							label={t("stream.desktop.copyWindowName")}
						/>
					</div>
				</div>
			</div>
		</NbCard>
	);
}
