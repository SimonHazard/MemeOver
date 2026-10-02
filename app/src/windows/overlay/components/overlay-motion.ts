import { DURATION, EASE_OUT } from "@memeover/ui/lib/motion";
import type { OverlayPosition } from "@/shared/types";
export const BADGE_ENTER_DELAY_S = 0.09;
export const CAPTION_ENTER_DELAY_S = 0.15;
const ORIGINS: Record<OverlayPosition, string> = {
	center: "50% 50%",
	"top-left": "0% 0%",
	top: "50% 0%",
	"top-right": "100% 0%",
	left: "0% 50%",
	right: "100% 50%",
	"bottom-left": "0% 100%",
	bottom: "50% 100%",
	"bottom-right": "100% 100%",
};
export function transformOriginFor(position: OverlayPosition): string {
	return ORIGINS[position];
}
export function captionMotion(reduced: boolean) {
	return reduced
		? {
				initial: { opacity: 0 },
				animate: { opacity: 1 },
				transition: { duration: DURATION.reduced, ease: EASE_OUT },
			}
		: {
				initial: { opacity: 0, transform: "translateY(4px)" },
				animate: { opacity: 1, transform: "translateY(0px)" },
				transition: { duration: 0.2, ease: EASE_OUT, delay: CAPTION_ENTER_DELAY_S },
			};
}
