import { cn } from "@memeover/ui/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { OverlayPosition } from "@/shared/types";

export type PreviewAspect = "9:16" | "16:9" | "1:1";

const ASPECT_CSS: Record<PreviewAspect, string> = {
	"9:16": "9 / 16",
	"16:9": "16 / 9",
	"1:1": "1 / 1",
};

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

// The preview frame simulates a 16:9 monitor. In fit-box, the media occupies a
// `mediaSize × mediaSize` vmin square. Converted to the preview frame, that's
// `mediaSize%` of the frame height on BOTH axes — which means the horizontal
// footprint in the preview is (mediaSize * 9/16)% of the frame width.
const PREVIEW_ASPECT_H_W_RATIO = 9 / 16;

interface Bbox {
	x: number;
	y: number;
	w: number;
	h: number;
}

function anchorBbox(position: OverlayPosition, mediaSize: number): Bbox {
	// Box width in the preview = mediaSize * (height/width) of the preview frame
	// (preview frame is 16:9 → h/w = 9/16). Box height = mediaSize% of frame height.
	const w = mediaSize * PREVIEW_ASPECT_H_W_RATIO;
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
	/** Which aspect the simulated media content takes inside the fit-box. Defaults to portrait (TikTok/Reels). */
	previewAspect?: PreviewAspect;
}

export function PositionPreview({
	position,
	mediaSize,
	offsetX = 0,
	offsetY = 0,
	label,
	previewAspect = "9:16",
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
				{/* Full-size layer carrying the offset translate. `translate(%,%)` resolves
				    to % of this layer's own size — which equals the preview frame, mirroring
				    the overlay's % of viewport semantics. */}
				<div
					className="absolute inset-0"
					style={{ transform: `translate(${offsetX}%, ${offsetY}%)` }}
				>
					{/* The fit-box — a dashed square sized from `mediaSize` as % of frame
					    height on both axes. Represents the hard bounds inside which media fits. */}
					<div
						className={cn(
							PREVIEW_POSITION_CLASSES[position],
							"flex items-center justify-center border border-dashed rounded transition-colors",
							offscreen ? "border-destructive/70" : "border-primary/40",
						)}
						style={{ height: `${mediaSize}%`, aspectRatio: "1 / 1" }}
					>
						{/* Simulated media — adopts the toggled aspect, fills the box diagonally. */}
						<div
							className={cn(
								"flex items-center justify-center rounded border transition-colors",
								offscreen
									? "bg-destructive/20 border-destructive"
									: "bg-primary/20 border-primary/50",
							)}
							style={{
								maxWidth: "100%",
								maxHeight: "100%",
								aspectRatio: ASPECT_CSS[previewAspect],
								width: previewAspect === "9:16" ? "auto" : "100%",
								height: previewAspect === "9:16" ? "100%" : "auto",
							}}
						>
							<span
								className={cn(
									"text-xs font-medium select-none truncate px-1",
									offscreen ? "text-destructive" : "text-primary/70",
								)}
							>
								{label}
							</span>
						</div>
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
