import { NbBadge } from "@memeover/ui/components/branded/nb-badge";
import { DURATION, EASE_OUT } from "@memeover/ui/lib/motion";
import { NB_SHADOW_MD } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import { motion } from "framer-motion";
import { Pause } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatPausedUntil } from "@/shared/guild-pause";
import { useAppStore } from "@/shared/store";
export function PauseIndicator({
	inline = false,
	placement = "top",
}: {
	inline?: boolean;
	/** Overlay edge whose centre shows the status; settings ignore it. */
	placement?: "top" | "bottom";
}) {
	const until = useAppStore((s) => s.guildPausedUntil);
	const { t, i18n } = useTranslation();
	if (until === null) return null;
	const time = formatPausedUntil(until, i18n.language);
	const content = (
		<>
			<Pause className="size-3" aria-hidden="true" />
			{t("overlay.pausedGuild")}{" "}
			{time ? t("overlay.pausedGuildUntil", { time }) : t("overlay.pausedGuildIndefinite")}
		</>
	);
	// Settings is a tool: the status appears instantly, styled like the overlay health badge.
	if (inline)
		return (
			<NbBadge variant="outline" className="gap-1.5 px-2 py-0.5">
				{content}
			</NbBadge>
		);
	// An edge centre keeps the overlay status clear of corner-anchored chrome such as the DEV badge.
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: DURATION.reduced, ease: EASE_OUT }}
			className={cn(
				"absolute left-1/2 flex -translate-x-1/2 items-center gap-2 border-2 border-foreground bg-popover px-3 py-1 font-display text-xs tracking-wide text-popover-foreground",
				placement === "top" ? "top-3" : "bottom-3",
				NB_SHADOW_MD,
			)}
		>
			{content}
		</motion.div>
	);
}
