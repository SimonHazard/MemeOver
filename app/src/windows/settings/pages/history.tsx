import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { HistoryItem } from "@/shared/history";
import { clearHistory, loadHistory, replayHistoryItem } from "@/shared/history";
import { HistoryItemCard } from "@/windows/settings/components/history-item";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryPageProps {
	onBack: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryPage({ onBack }: HistoryPageProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

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
		<div className="p-6">
			<div className="mx-auto max-w-2xl space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
							<ArrowLeft className="h-4 w-4" />
							{t("history.back")}
						</Button>
						<h1 className="text-2xl font-bold tracking-tight">{t("history.title")}</h1>
					</div>
					{items.length > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="text-destructive hover:text-destructive"
							onClick={() => doClear()}
						>
							<Trash2 className="h-4 w-4 mr-1" />
						</Button>
					)}
				</div>

				<Separator />

				{/* Content */}
				{isLoading ? (
					<div className="space-y-3">
						{[1, 2, 3, 4, 5].map((i) => (
							<Skeleton key={i} className="h-16 w-full rounded-lg" />
						))}
					</div>
				) : items.length === 0 ? (
					<p className="text-center text-muted-foreground py-12">{t("history.empty")}</p>
				) : (
					<div className="space-y-2">
						{items.map((item) => (
							<HistoryItemCard
								key={`${item.recordedAt}-${item.message_id}`}
								item={item}
								onReplay={(i) => doReplay(i)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
