export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;
/** Seconds; exits are shorter than entrances. */
export const DURATION = {
	press: 0.16,
	tooltip: 0.13,
	popover: 0.18,
	modal: 0.22,
	exit: 0.13,
	reduced: 0.12,
} as const;
/** The product's overlay media pop; retain plan 007's values. */
export const SPRING_MEDIA_POP = {
	type: "spring",
	duration: 0.28,
	bounce: 0.2,
} as const;
