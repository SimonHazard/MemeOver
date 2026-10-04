import { EASE_OUT } from "@memeover/ui/lib/motion";
import { NB_SHADOW_MD } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { useAppStore } from "@/shared/store";
import type { WsStatus } from "@/shared/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserCountIndicatorProps {
	wsStatus: WsStatus;
}

type LiveState = "active" | "alone" | "offline";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLiveState(wsStatus: WsStatus, memberCount: number): LiveState {
	if (wsStatus !== "connected") return "offline";
	if (memberCount <= 1) return "alone";
	return "active";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserCountIndicator({ wsStatus }: UserCountIndicatorProps) {
	const { t } = useTranslation();
	const memberCount = useAppStore((s) => s.memberCount);
	const liveState = getLiveState(wsStatus, memberCount);

	return (
		<div
			className={cn(
				// Base layout
				"inline-flex items-center gap-2 px-3 py-1.5 rounded-lg",
				// Neo-brutalist borders & shadow
				"border-2 border-foreground",
				NB_SHADOW_MD,
				// State-driven background
				liveState === "active" && "bg-emerald-400 text-black",
				liveState === "alone" && "bg-amber-300 text-black",
				liveState === "offline" && "bg-background text-muted-foreground",
			)}
		>
			{/* ── Live dot ── */}
			<span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
				<span
					className={cn(
						"relative inline-flex h-2 w-2 rounded-full",
						liveState === "active" && "bg-emerald-700",
						liveState === "alone" && "bg-amber-600",
						liveState === "offline" && "bg-muted-foreground/30",
					)}
				/>
			</span>

			{/* ── Icon ── */}
			<Users className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />

			{liveState === "active" && (
				<span
					className="font-display text-sm font-bold tabular-nums leading-none tracking-wide"
					aria-hidden="true"
				>
					<AnimatedNumber value={memberCount} />
				</span>
			)}
			{/* ── Label (slides on state change) ── */}
			<AnimatePresence mode="popLayout" initial={false}>
				<motion.span
					key={liveState}
					initial={{ opacity: 0, x: 6 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -6 }}
					transition={{ duration: 0.15, ease: EASE_OUT }}
					className="font-display text-xs font-medium tracking-wide whitespace-nowrap leading-none"
					aria-hidden="true"
				>
					{liveState === "active" && t("memberCount.online")}
					{liveState === "alone" && t("memberCount.alone")}
					{liveState === "offline" && t("memberCount.offline")}
				</motion.span>
			</AnimatePresence>
			{/* The animated parts above are hidden from assistive technology; this is their text. */}
			<span className="sr-only">
				{liveState === "active" && t("memberCount.ariaOnline", { count: memberCount })}
				{liveState === "alone" && t("memberCount.ariaAlone")}
				{liveState === "offline" && t("memberCount.ariaOffline")}
			</span>
		</div>
	);
}
