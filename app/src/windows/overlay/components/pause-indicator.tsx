import { DURATION, EASE_OUT } from "@memeover/ui/lib/motion";
import { motion } from "framer-motion";
import { Pause } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatPausedUntil } from "@/shared/guild-pause";
import { useAppStore } from "@/shared/store";
export function PauseIndicator({ inline = false }: { inline?: boolean }) {
	const until = useAppStore((s) => s.guildPausedUntil);
	const { t, i18n } = useTranslation();
	if (until === null) return null;
	const time = formatPausedUntil(until, i18n.language);
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: DURATION.reduced, ease: EASE_OUT }}
			className={
				inline
					? "inline-flex items-center gap-2 rounded-full border-2 border-foreground px-3 py-1 text-xs"
					: "absolute top-10 right-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white"
			}
		>
			<Pause className="size-3" />
			{t("overlay.pausedGuild")}{" "}
			{time ? t("overlay.pausedGuildUntil", { time }) : t("overlay.pausedGuildIndefinite")}
		</motion.div>
	);
}
