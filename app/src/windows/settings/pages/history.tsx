import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { Separator } from "@memeover/ui/components/ui/separator";
import { Skeleton } from "@memeover/ui/components/ui/skeleton";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTauriEventVersion } from "@/hooks/useTauriEvent";
import type { HistoryItem } from "@/shared/history";
import { clearHistory, loadHistory, replayHistoryItem } from "@/shared/history";
import { useAppStore } from "@/shared/store";
import { HistoryItemCard } from "@/windows/settings/components/history-item";

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const overlayAlive = useAppStore((s) => s.overlayHealth === "alive");

	// Increment on every "history-updated" Tauri event — used as a query key suffix
	// to trigger automatic refetches without any useEffect or listen() subscription.
	const historyVersion = useTauriEventVersion("history-updated");

	const { data: items = [], isLoading } = useQuery({
		queryKey: ["history", historyVersion],
		queryFn: loadHistory,
		// Keep previous data visible while the new query is loading to avoid
		// a skeleton flash on every history update.
		placeholderData: keepPreviousData,
	});

	const { mutate: doReplay } = useMutation({
		mutationFn: (item: HistoryItem) => replayHistoryItem(item),
		onSuccess: () => {
			toast.success(t("toast.replayQueued"));
		},
		onError: () => {
			toast.error(t("toast.replayError"));
		},
	});

	const { mutate: doClear } = useMutation({
		mutationFn: clearHistory,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["history"] });
			toast.success(t("toast.queueCleared"));
		},
		onError: () => {
			toast.error(t("toast.clearError"));
		},
	});

	return (
		<div className="p-5">
			<div className="mx-auto max-w-2xl space-y-5">
				{/* ── Header ── */}
				<div className="flex items-center justify-between">
					<h1 className="font-display text-xl tracking-wide">{t("history.title")}</h1>
					{items.length > 0 && (
						<NbButton
							variant="outline"
							size="sm"
							className="text-destructive hover:text-destructive gap-1"
							onClick={() => doClear()}
						>
							<Trash2 className="h-3.5 w-3.5" />
							{t("history.clearAll")}
						</NbButton>
					)}
				</div>

				<Separator />

				{/* ── Content ── */}
				{isLoading ? (
					<div className="space-y-2">
						{[1, 2, 3, 4, 5].map((i) => (
							<Skeleton key={i} className="h-16 w-full rounded-lg" />
						))}
					</div>
				) : items.length === 0 ? (
					<p className="text-center text-muted-foreground py-12 font-text">{t("history.empty")}</p>
				) : (
					<motion.div className="space-y-2" layout>
						<AnimatePresence initial={false}>
							{items.map((item) => (
								<motion.div
									key={`${item.recordedAt}-${item.message_id}`}
									layout
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, scale: 0.95 }}
									transition={{ duration: 0.2, ease: "easeOut" }}
								>
									<HistoryItemCard
										item={item}
										disabled={!overlayAlive}
										onReplay={(i) => doReplay(i)}
									/>
								</motion.div>
							))}
						</AnimatePresence>
					</motion.div>
				)}
			</div>
		</div>
	);
}
