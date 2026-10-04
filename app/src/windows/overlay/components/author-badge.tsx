import { Avatar, AvatarFallback, AvatarImage } from "@memeover/ui/components/ui/avatar";
import { DURATION } from "@memeover/ui/lib/motion";
import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import { BADGE_ENTER_DELAY_S } from "./overlay-motion";

// Lands just after the media pop has started: the media reads first, then who sent it.

// Sized in em from a viewport-relative base so the badge stays legible from 1080p to 4K.
export const AUTHOR_BADGE_FONT_SIZE = "clamp(12px, 1.5vmin, 22px)";
/** Rendered badge height: 1.6em avatar + 2 × 0.25em vertical padding. */
export const AUTHOR_BADGE_HEIGHT = `calc(2.1 * ${AUTHOR_BADGE_FONT_SIZE})`;

// Discord's default avatar palette — a familiar colour while the avatar loads (or if it fails).
const FALLBACK_COLORS = ["#5865F2", "#757E8A", "#3BA55C", "#FAA61A", "#ED4245", "#EB459F"] as const;

/** Stable fallback colour per author, so the same friend always gets the same placeholder. */
export function fallbackAvatarColor(authorId: string): string {
	let hash = 0;
	for (let i = 0; i < authorId.length; i++) {
		hash = (hash * 31 + authorId.charCodeAt(i)) | 0;
	}
	return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

interface AuthorBadgeProps {
	authorId: string;
	username: string;
	displayName?: string;
	avatarUrl: string;
	/** Caps the badge to the media box so long names truncate instead of overflowing. */
	maxWidth: string;
}

export function AuthorBadge({
	authorId,
	username,
	displayName,
	avatarUrl,
	maxWidth,
}: AuthorBadgeProps) {
	const reduceMotion = useReducedMotion();
	const name = displayName ?? username;

	return (
		<div
			style={
				{
					fontSize: AUTHOR_BADGE_FONT_SIZE,
					maxWidth,
					"--badge-enter-delay": `${BADGE_ENTER_DELAY_S}s`,
					"--badge-reduced-duration": `${DURATION.reduced}s`,
				} as CSSProperties
			}
			className="overlay-author-badge flex min-w-0 items-center gap-[0.45em] self-center
			           rounded-full bg-black/65 py-[0.25em] pr-[0.85em] pl-[0.25em]"
		>
			<motion.span
				className="flex shrink-0"
				initial={reduceMotion ? false : { transform: "scale(0.85)" }}
				animate={{
					transform: "scale(1)",
					transition: { type: "spring", duration: 0.35, bounce: 0.3, delay: BADGE_ENTER_DELAY_S },
				}}
			>
				<Avatar className="size-[1.6em] ring-1 ring-white/15">
					<AvatarImage src={avatarUrl} alt="" />
					<AvatarFallback
						className="font-bold text-[0.7em] text-white"
						style={{ backgroundColor: fallbackAvatarColor(authorId) }}
					>
						{name.charAt(0).toUpperCase()}
					</AvatarFallback>
				</Avatar>
			</motion.span>
			<span className="min-w-0 truncate font-semibold text-white leading-none">{name}</span>
		</div>
	);
}
