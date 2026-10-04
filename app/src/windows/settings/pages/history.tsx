import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { NbSwitch } from "@memeover/ui/components/branded/nb-switch";
import { Separator } from "@memeover/ui/components/ui/separator";
import { Skeleton } from "@memeover/ui/components/ui/skeleton";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { AnimatedList } from "@/components/motion/animated-list";
import { useTauriEventVersion } from "@/hooks/useTauriEvent";
import type { HistoryItem } from "@/shared/history";
import {
	clearHistory,
	loadHistory,
	purgeExpiredHistory,
	replayHistoryItem,
} from "@/shared/history";
import { addMutedAuthor, removeMutedAuthor } from "@/shared/muted-authors";
import { loadSettings, patchSettings, persistSettings } from "@/shared/settings";
import { useAppStore } from "@/shared/store";
import { HistoryItemCard } from "@/windows/settings/components/history-item";
import { MutedAuthorsCard } from "../components/muted-authors-card";

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: loadSettings });
	const { mutate: setAutoPurge, isPending: isSavingPurge } = useMutation({
		mutationFn: async (historyAutoPurge: boolean) => {
			await persistSettings({ ...(await loadSettings()), historyAutoPurge });
			if (historyAutoPurge) await purgeExpiredHistory();
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
			void queryClient.invalidateQueries({ queryKey: ["history"] });
		},
		onError: () => toast.error(t("toast.settingsError")),
	});
	const { mutate: cleanNow, isPending: isCleaning } = useMutation({
		mutationFn: () => purgeExpiredHistory(),
		onSuccess: (count) => {
			void queryClient.invalidateQueries({ queryKey: ["history"] });
			toast.success(count ? t("toast.historyPurged", { count }) : t("history.nothingToPurge"));
		},
		onError: () => toast.error(t("toast.clearError")),
	});
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
			toast.success(t("toast.historyCleared"));
		},
		onError: () => {
			toast.error(t("toast.clearError"));
		},
	});

	const { mutate: muteAuthor } = useMutation({
		mutationFn: (item: HistoryItem) =>
			patchSettings((s) => ({
				...s,
				mutedAuthors: addMutedAuthor(
					s.mutedAuthors,
					{
						id: item.author_id,
						username: item.author_display_name ?? item.author_username,
						avatarUrl: item.author_avatar_url,
					},
					Date.now(),
				),
			})),
		onSuccess: (_settings, item) => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
			toast.success(
				t("toast.authorMuted", { name: item.author_display_name ?? item.author_username }),
				{
					action: {
						label: t("toast.undo"),
						onClick: () => {
							void patchSettings((s) => ({
								...s,
								mutedAuthors: removeMutedAuthor(s.mutedAuthors, item.author_id),
							}))
								.then(() => queryClient.invalidateQueries({ queryKey: ["settings"] }))
								.catch(() => toast.error(t("toast.settingsError")));
						},
					},
				},
			);
		},
		onError: () => toast.error(t("toast.settingsError")),
	});

	return (
		<div className="p-5">
			<div className="mx-auto max-w-2xl space-y-5">
				{/* ── Header ── */}
				<div className="flex items-center justify-between">
					<h1 className="font-display text-xl tracking-wide">{t("history.title")}</h1>
					{items.length > 0 && (
						<ConfirmActionButton
							label={t("history.clearAll")}
							title={t("history.clearConfirmTitle")}
							description={t("history.clearConfirmDesc")}
							confirmLabel={t("history.clearAll")}
							onConfirm={() => doClear()}
						/>
					)}
				</div>
				<p className="text-sm font-text text-muted-foreground">{t("history.localNote")}</p>

				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<NbSwitch
							id="history-auto-purge"
							checked={settings?.historyAutoPurge ?? true}
							disabled={!settings || isSavingPurge}
							onCheckedChange={(checked) => setAutoPurge(checked)}
						/>
						<div>
							<label htmlFor="history-auto-purge" className="text-sm font-display">
								{t("history.autoPurge")}
							</label>
							<p className="text-xs text-muted-foreground">{t("history.autoPurgeHint")}</p>
						</div>
					</div>
					<NbButton variant="outline" size="sm" disabled={isCleaning} onClick={() => cleanNow()}>
						{t("history.cleanNow")}
					</NbButton>
				</div>
				<MutedAuthorsCard />
				<Separator />

				{/* ── Content ── */}
				<AnimatedList
					items={items}
					itemKey={(item) => `${item.recordedAt}-${item.message_id}`}
					renderItem={(item) => (
						<HistoryItemCard
							item={item}
							onMuteAuthor={muteAuthor}
							disabled={!overlayAlive}
							onReplay={(i) => doReplay(i)}
						/>
					)}
					loading={isLoading}
					skeleton={
						<div className="space-y-2">
							{[1, 2, 3, 4, 5].map((i) => (
								<Skeleton key={i} className="h-16 w-full rounded-lg" />
							))}
						</div>
					}
					empty={
						<p className="text-center text-muted-foreground py-12 font-text">
							{t("history.empty")}
						</p>
					}
				/>
			</div>
		</div>
	);
}
