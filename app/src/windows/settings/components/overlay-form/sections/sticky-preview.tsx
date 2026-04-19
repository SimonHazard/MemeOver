import { Separator } from "@memeover/ui/components/ui/separator";
import { useTranslation } from "react-i18next";
import { AspectToggle } from "../../aspect-toggle";
import type { PreviewAspect } from "../../position-preview";
import { PositionPreview } from "../../position-preview";
import { useOverlayFormContext } from "../form-hook";

interface StickyPreviewProps {
	previewAspect: PreviewAspect;
	onPreviewAspectChange: (v: PreviewAspect) => void;
}

export function StickyPreview({ previewAspect, onPreviewAspectChange }: StickyPreviewProps) {
	const form = useOverlayFormContext();
	const { t } = useTranslation();

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h2 className="font-display text-base tracking-wide">{t("display.preview")}</h2>
				<AspectToggle value={previewAspect} onChange={onPreviewAspectChange} />
			</div>
			<Separator />

			<form.Subscribe
				selector={(s) =>
					[
						s.values.position,
						s.values.mediaSize,
						s.values.duration,
						s.values.mediaOpacity,
						s.values.positionOffsetX,
						s.values.positionOffsetY,
					] as const
				}
			>
				{([position, mediaSize, duration, opacity, offsetX, offsetY]) => (
					<div className="space-y-3">
						<PositionPreview
							position={position}
							mediaSize={mediaSize}
							offsetX={offsetX}
							offsetY={offsetY}
							previewAspect={previewAspect}
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
