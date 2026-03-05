import { AnimatePresence, motion } from "framer-motion";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
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
				"shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
				// Hover micro-interaction — badge lifts and shadow extends
				"transition-all duration-100 ease-out",
				"hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
				// State-driven background
				liveState === "active" && "bg-emerald-400 text-black",
				liveState === "alone" && "bg-amber-300 text-black",
				liveState === "offline" && "bg-background text-muted-foreground",
			)}
		>
			{/* ── Live dot ── */}
			<span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
				{liveState === "active" && (
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-700 opacity-60" />
				)}
				{liveState === "alone" && (
					<span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-amber-600 opacity-60" />
				)}
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

			{/* ── Count (springs on every change) ── */}
			<AnimatePresence mode="popLayout" initial={false}>
				{liveState === "active" && (
					<motion.span
						key={memberCount}
						initial={{ scale: 1.5, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.5, opacity: 0 }}
						transition={{ type: "spring", stiffness: 600, damping: 28 }}
						className="font-display text-sm font-bold tabular-nums leading-none tracking-wide"
						aria-hidden="true"
					>
						{memberCount}
					</motion.span>
				)}
			</AnimatePresence>

			{/* ── Label (slides on state change) ── */}
			<AnimatePresence mode="popLayout" initial={false}>
				<motion.span
					key={liveState}
					initial={{ opacity: 0, x: 6 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -6 }}
					transition={{ duration: 0.15, ease: "easeOut" }}
					className="font-display text-xs font-medium tracking-wide whitespace-nowrap leading-none"
					aria-hidden="true"
				>
					{liveState === "active" && t("memberCount.online")}
					{liveState === "alone" && t("memberCount.alone")}
					{liveState === "offline" && t("memberCount.offline")}
				</motion.span>
			</AnimatePresence>
		</div>
	);
}
