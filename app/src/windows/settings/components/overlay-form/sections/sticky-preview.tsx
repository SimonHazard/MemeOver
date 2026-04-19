import { Separator } from "@memeover/ui/components/ui/separator";
import { useTranslation } from "react-i18next";
import { PositionPreview } from "../../position-preview";
import { useOverlayFormContext } from "../form-hook";

export function StickyPreview() {
	const form = useOverlayFormContext();
	const { t } = useTranslation();

	return (
		<div className="space-y-3">
			<h2 className="font-display text-base tracking-wide">{t("display.preview")}</h2>
			<Separator />

			<form.Subscribe
				selector={(s) =>
					[s.values.position, s.values.mediaSize, s.values.duration, s.values.mediaOpacity] as const
				}
			>
				{([position, mediaSize, duration, opacity]) => (
					<div className="space-y-3">
						<PositionPreview
							position={position}
							mediaSize={mediaSize}
							label={t("display.preview_media")}
						/>
						<p className="text-[11px] font-mono text-muted-foreground leading-relaxed break-words">
							{t("display.preview_summary", {
								size: mediaSize,
								position,
								duration,
								opacity,
							})}
						</p>
					</div>
				)}
			</form.Subscribe>
		</div>
	);
}
