import { cn } from "@memeover/ui/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OverlayPosition } from "@/shared/types";

const PREVIEW_POSITION_CLASSES: Record<OverlayPosition, string> = {
	center: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
	"top-left": "absolute top-2 left-2",
	top: "absolute top-2 left-1/2 -translate-x-1/2",
	"top-right": "absolute top-2 right-2",
	left: "absolute top-1/2 left-2 -translate-y-1/2",
	right: "absolute top-1/2 right-2 -translate-y-1/2",
	"bottom-left": "absolute bottom-2 left-2",
	bottom: "absolute bottom-2 left-1/2 -translate-x-1/2",
	"bottom-right": "absolute bottom-2 right-2",
};

// Approximate the Tailwind `top-2 / left-2 / …` edge inset (8px) as a % of the
// preview frame. Exact value depends on preview size, but ~2% is visually close
// enough for the off-screen detection heuristic below.
const EDGE_INSET_PCT = 2;

interface Bbox {
	x: number;
	y: number;
	w: number;
	h: number;
}

function anchorBbox(position: OverlayPosition, mediaSize: number): Bbox {
	// Media rect is 16:9 inside a 16:9 preview, so %-of-container is the same on
	// both axes — see layout note in placement-section.tsx.
	const w = mediaSize;
	const h = mediaSize;

	const left = position === "top-left" || position === "left" || position === "bottom-left";
	const right = position === "top-right" || position === "right" || position === "bottom-right";
	const top = position === "top-left" || position === "top" || position === "top-right";
	const bottom = position === "bottom-left" || position === "bottom" || position === "bottom-right";

	const x = left ? EDGE_INSET_PCT : right ? 100 - w - EDGE_INSET_PCT : (100 - w) / 2;
	const y = top ? EDGE_INSET_PCT : bottom ? 100 - h - EDGE_INSET_PCT : (100 - h) / 2;

	return { x, y, w, h };
}

function isOffscreen(b: Bbox): boolean {
	return b.x < 0 || b.y < 0 || b.x + b.w > 100 || b.y + b.h > 100;
}

interface PositionPreviewProps {
	position: OverlayPosition;
	mediaSize: number;
	offsetX?: number;
	offsetY?: number;
	label: string;
}

export function PositionPreview({
	position,
	mediaSize,
	offsetX = 0,
	offsetY = 0,
	label,
}: PositionPreviewProps) {
	const { t } = useTranslation();

	const base = anchorBbox(position, mediaSize);
	const finalBbox: Bbox = {
		x: base.x + offsetX,
		y: base.y + offsetY,
		w: base.w,
		h: base.h,
	};
	const offscreen = isOffscreen(finalBbox);

	return (
		<div className="space-y-2">
			<div
				className={cn(
					"relative w-full aspect-video bg-background rounded-lg overflow-hidden",
					"border transition-colors",
					offscreen ? "border-destructive" : "border-border",
				)}
			>
				{/* Full-size layer carrying the offset translate. Because `translate(%, %)`
				    resolves to % of this layer's own size — and the layer fills the preview
				    frame — the offset ends up being % of the preview, matching the overlay
				    semantics (% of viewport). */}
				<div
					className="absolute inset-0"
					style={{ transform: `translate(${offsetX}%, ${offsetY}%)` }}
				>
					<div
						className={cn(
							PREVIEW_POSITION_CLASSES[position],
							"rounded flex items-center justify-center border transition-colors",
							offscreen
								? "bg-destructive/20 border-destructive"
								: "bg-primary/20 border-primary/50",
						)}
						style={{ width: `${mediaSize}%`, aspectRatio: "16/9" }}
					>
						<span
							className={cn(
								"text-xs font-medium select-none",
								offscreen ? "text-destructive" : "text-primary/70",
							)}
						>
							{label}
						</span>
					</div>
				</div>

				{/* Off-screen badge — floats in the top-right corner of the preview */}
				{offscreen && (
					<div
						className={cn(
							"absolute top-1.5 right-1.5 flex items-center gap-1",
							"bg-destructive text-destructive-foreground rounded px-1.5 py-0.5",
							"text-[10px] font-medium tracking-wide uppercase shadow-sm",
						)}
					>
						<AlertTriangle className="h-3 w-3" />
						{t("display.preview_offscreen_badge")}
					</div>
				)}
			</div>

			{offscreen && (
				<p className="text-xs text-destructive flex items-center gap-1.5">
					<AlertTriangle className="h-3.5 w-3.5 shrink-0" />
					{t("display.preview_offscreen_hint")}
				</p>
			)}
		</div>
	);
}
