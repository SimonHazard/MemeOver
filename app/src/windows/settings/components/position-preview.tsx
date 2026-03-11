import { cn } from "@memeover/ui/lib/utils";
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

interface PositionPreviewProps {
	position: OverlayPosition;
	mediaSize: number;
	label: string;
}

export function PositionPreview({ position, mediaSize, label }: PositionPreviewProps) {
	return (
		<div className="relative w-full aspect-video bg-background rounded-lg border border-border overflow-hidden">
			<div
				className={cn(
					PREVIEW_POSITION_CLASSES[position],
					"bg-primary/20 border border-primary/50 rounded flex items-center justify-center",
				)}
				style={{ width: `${mediaSize}%`, aspectRatio: "16/9" }}
			>
				<span className="text-primary/70 text-xs font-medium select-none">{label}</span>
			</div>
		</div>
	);
}
