import { DURATION, EASE_OUT } from "@memeover/ui/lib/motion";
export const BADGE_ENTER_DELAY_S = 0.09;
export const CAPTION_ENTER_DELAY_S = 0.15;
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
