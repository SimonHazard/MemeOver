import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { HistoryItem } from "@/shared/history";
import { clearHistory, loadHistory, replayHistoryItem } from "@/shared/history";
import { useAppStore } from "@/shared/store";
import { HistoryItemCard } from "@/windows/settings/components/history-item";

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const overlayAlive = useAppStore((s) => s.overlayHealth === "alive");

	const { data: items = [], isLoading } = useQuery({
		queryKey: ["history"],
		queryFn: loadHistory,
	});

	const { mutate: doReplay } = useMutation({
		mutationFn: (item: HistoryItem) => replayHistoryItem(item),
		onSuccess: () => {
			toast.success(t("toast.replayQueued"));
		},
	});

	const { mutate: doClear } = useMutation({
		mutationFn: clearHistory,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["history"] });
			toast.success(t("toast.queueCleared"));
		},
	});

	return (
		<div className="p-5">
			<div className="mx-auto max-w-xl space-y-5">
				{/* ── Header ── */}
				<div className="flex items-center justify-between">
					<h1 className="font-display text-xl tracking-wide">{t("history.title")}</h1>
					{items.length > 0 && (
						<Button
							variant="outline"
							size="sm"
							className="border-2 border-foreground text-destructive hover:text-destructive shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all font-display text-xs tracking-wide gap-1"
							onClick={() => doClear()}
						>
							<Trash2 className="h-3.5 w-3.5" />
							{t("history.clearAll")}
						</Button>
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
					<div className="space-y-2">
						{items.map((item) => (
							<HistoryItemCard
								key={`${item.recordedAt}-${item.message_id}`}
								item={item}
								disabled={!overlayAlive}
								onReplay={(i) => doReplay(i)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
