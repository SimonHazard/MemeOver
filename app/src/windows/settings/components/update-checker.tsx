import { Button } from "@memeover/ui/components/ui/button";
import { NbCard } from "@memeover/ui/components/ui/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@memeover/ui/components/ui/dialog";
import { Progress } from "@memeover/ui/components/ui/progress";
import { ScrollArea } from "@memeover/ui/components/ui/scroll-area";
import { Separator } from "@memeover/ui/components/ui/separator";
import { AnimatePresence, motion } from "framer-motion";
import {
	ArrowRight,
	CheckCircle2,
	Download,
	Loader2,
	RefreshCw,
	Rocket,
	TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { type UpdateMeta, useUpdater } from "@/windows/settings/hooks/useUpdater";

// ─── Constants ────────────────────────────────────────────────────────────────

const NB_BTN =
	"border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all font-display tracking-wide text-xs disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none";

// ─── Markdown components (styled to match the NB design) ─────────────────────

const markdownComponents: Components = {
	h1: ({ children }) => (
		<h1 className="mt-4 mb-2 text-lg font-display font-bold tracking-wide">{children}</h1>
	),
	h2: ({ children }) => (
		<h2 className="mt-4 mb-1 text-base font-display font-bold tracking-wide">{children}</h2>
	),
	h3: ({ children }) => (
		<h3 className="mt-3 mb-1 text-sm font-display font-bold tracking-wide">{children}</h3>
	),
	p: ({ children }) => <p className="text-sm font-text leading-relaxed">{children}</p>,
	ul: ({ children }) => <ul className="space-y-0.5 pl-4">{children}</ul>,
	ol: ({ children }) => <ol className="space-y-0.5 pl-4 list-decimal">{children}</ol>,
	li: ({ children }) => <li className="list-disc text-sm font-text leading-snug">{children}</li>,
	strong: ({ children }) => <strong className="font-bold">{children}</strong>,
	code: ({ children }) => (
		<code className="bg-muted rounded px-1 font-mono text-[11px]">{children}</code>
	),
};

// ─── Version chip ─────────────────────────────────────────────────────────────

function VersionChip({
	label,
	version,
	highlight = false,
	delay = 0,
}: {
	label: string;
	version: string;
	highlight?: boolean;
	delay?: number;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay, duration: 0.25, ease: "easeOut" }}
			className={cn(
				"flex-1 border-2 border-foreground p-3 text-center",
				highlight && "bg-primary/5 shadow-[2px_2px_0px_0px_var(--nb-shadow)]",
			)}
		>
			<p className="text-[10px] uppercase tracking-widest text-muted-foreground font-display mb-1">
				{label}
			</p>
			<p className={cn("font-display text-xl tracking-wide", highlight && "text-primary")}>
				v{version}
			</p>
		</motion.div>
	);
}

// ─── Update dialog content ────────────────────────────────────────────────────

function UpdateDialogContent({
	meta,
	isDownloading,
	progress,
	isReady,
	onDownload,
	onInstall,
}: {
	meta: UpdateMeta;
	isDownloading: boolean;
	progress: number;
	isReady: boolean;
	onDownload: () => void;
	onInstall: () => void;
}) {
	const { t } = useTranslation();

	return (
		<>
			<DialogHeader>
				<DialogTitle className="font-display tracking-wide text-base">
					{t("updater.dialogTitle", { version: meta.version })}
				</DialogTitle>
			</DialogHeader>

			{/* Version comparison */}
			<div className="flex items-center gap-3">
				<VersionChip label={t("updater.currentLabel")} version={meta.currentVersion} delay={0} />
				<motion.div
					initial={{ opacity: 0, x: -6 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.1, duration: 0.2 }}
				>
					<ArrowRight className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
				</motion.div>
				<VersionChip label={t("updater.newLabel")} version={meta.version} highlight delay={0.08} />
			</div>

			{/* Changelog */}
			{meta.body && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.15, duration: 0.3 }}
					className="space-y-2"
				>
					<p className="text-xs uppercase tracking-widest text-muted-foreground font-display">
						{t("updater.changelog")}
					</p>
					<div className="border-2 border-foreground">
						<ScrollArea className="h-44 px-3 py-2">
							<Markdown components={markdownComponents}>{meta.body}</Markdown>
						</ScrollArea>
					</div>
				</motion.div>
			)}

			{/* Download progress */}
			<AnimatePresence>
				{(isDownloading || isReady) && (
					<motion.div
						key="progress"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.25, ease: "easeInOut" }}
						className="overflow-hidden"
					>
						<div className="space-y-2 pt-1">
							<Progress
								value={isReady ? 100 : progress}
								className="h-2.5 border border-foreground rounded-none bg-muted"
							/>
							<p className="text-xs text-center text-muted-foreground font-text">
								{isReady ? t("updater.readyToInstall") : t("updater.downloading", { progress })}
							</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<DialogFooter className="gap-2 sm:gap-2">
				{/* Close (later) — always available unless ready to install */}
				{!isReady && (
					<DialogClose asChild>
						<Button variant="outline" size="sm" className={NB_BTN} disabled={isDownloading}>
							{t("updater.later")}
						</Button>
					</DialogClose>
				)}

				{/* Primary action */}
				{isReady ? (
					<Button size="sm" className={NB_BTN} onClick={onInstall}>
						<Rocket className="size-3.5" aria-hidden="true" />
						{t("updater.relaunch")}
					</Button>
				) : (
					<Button size="sm" className={NB_BTN} onClick={onDownload} disabled={isDownloading}>
						{isDownloading ? (
							<Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
						) : (
							<Download className="size-3.5" aria-hidden="true" />
						)}
						{isDownloading ? t("updater.downloading", { progress }) : t("updater.downloadNow")}
					</Button>
				)}
			</DialogFooter>
		</>
	);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UpdateChecker() {
	const { t } = useTranslation();
	const { state, checkForUpdates, startDownload, installAndRelaunch, reset } = useUpdater();
	const [dialogOpen, setDialogOpen] = useState(false);

	async function handleCheck() {
		const result = await checkForUpdates();
		if (result.found) {
			toast.success(t("updater.foundToast", { version: result.version }));
			setDialogOpen(true);
		}
	}

	function handleStartDownload() {
		if (
			state.status !== "available" &&
			state.status !== "downloading" &&
			state.status !== "ready-to-install"
		)
			return;
		void startDownload({
			version: state.version,
			currentVersion: state.currentVersion,
			body: state.body,
			date: state.date,
		});
	}

	// Extract meta for the dialog from the three "rich" states
	const dialogMeta: UpdateMeta | null =
		state.status === "available" ||
		state.status === "downloading" ||
		state.status === "ready-to-install"
			? {
					version: state.version,
					currentVersion: state.currentVersion,
					body: state.body,
					date: state.date,
				}
			: null;

	return (
		<>
			<NbCard>
				<div className="space-y-4">
					<h2 className="font-display text-base tracking-wide">{t("updater.title")}</h2>

					<Separator />

					{/* ── Status row ── */}
					<div className="flex items-center gap-3 min-h-8">
						{/* idle */}
						{state.status === "idle" && (
							<Button
								variant="outline"
								className={cn(NB_BTN, "flex-1")}
								onClick={() => void handleCheck()}
							>
								<RefreshCw className="size-3.5" aria-hidden="true" />
								{t("updater.check")}
							</Button>
						)}

						{/* checking */}
						{state.status === "checking" && (
							<Button variant="outline" className={cn(NB_BTN, "flex-1")} disabled>
								<Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
								{t("updater.checking")}
							</Button>
						)}

						{/* up-to-date */}
						{state.status === "up-to-date" && (
							<div className="flex flex-1 items-center justify-between gap-3">
								<span className="flex items-center gap-2 text-sm font-text text-muted-foreground">
									<CheckCircle2 className="size-4 shrink-0 text-green-500" aria-hidden="true" />
									{t("updater.upToDate")}
								</span>
								<Button
									variant="ghost"
									size="sm"
									className="text-xs font-display h-auto p-1 text-muted-foreground hover:text-foreground"
									onClick={() => void handleCheck()}
								>
									<RefreshCw className="size-3" aria-hidden="true" />
									{t("updater.check")}
								</Button>
							</div>
						)}

						{/* available */}
						{state.status === "available" && (
							<div className="flex flex-1 items-center justify-between gap-3">
								<span className="text-sm font-text">
									{t("updater.available", { version: state.version })}
								</span>
								<Button size="sm" className={NB_BTN} onClick={() => setDialogOpen(true)}>
									<Download className="size-3.5" aria-hidden="true" />
									{t("updater.viewUpdate")}
								</Button>
							</div>
						)}

						{/* downloading */}
						{state.status === "downloading" && (
							<div className="flex flex-1 flex-col gap-2">
								<div className="flex items-center justify-between">
									<span className="text-xs font-text text-muted-foreground">
										{t("updater.downloading", { progress: state.progress })}
									</span>
									<Button
										variant="ghost"
										size="sm"
										className="text-xs font-display h-auto p-1 text-muted-foreground"
										onClick={() => setDialogOpen(true)}
									>
										{t("updater.viewProgress")}
									</Button>
								</div>
								<Progress
									value={state.progress}
									className="h-1.5 border border-foreground rounded-none"
								/>
							</div>
						)}

						{/* ready-to-install */}
						{state.status === "ready-to-install" && (
							<div className="flex flex-1 items-center justify-between gap-3">
								<span className="flex items-center gap-2 text-sm font-text">
									<CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
									{t("updater.readyToInstall")}
								</span>
								<Button size="sm" className={NB_BTN} onClick={() => setDialogOpen(true)}>
									<Rocket className="size-3.5" aria-hidden="true" />
									{t("updater.relaunch")}
								</Button>
							</div>
						)}

						{/* error */}
						{state.status === "error" && (
							<div className="flex flex-1 items-center justify-between gap-3">
								<span className="flex items-center gap-2 text-sm font-text text-destructive">
									<TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
									{t("updater.error")}
								</span>
								<Button
									variant="outline"
									size="sm"
									className={NB_BTN}
									onClick={() => {
										reset();
										void handleCheck();
									}}
								>
									<RefreshCw className="size-3.5" aria-hidden="true" />
									{t("updater.retry")}
								</Button>
							</div>
						)}
					</div>
				</div>
			</NbCard>

			{/* ── Update dialog ── */}
			<Dialog
				open={dialogOpen}
				onOpenChange={(open) => {
					// Prevent closing while download is active
					if (!open && state.status === "downloading") return;
					setDialogOpen(open);
				}}
			>
				<DialogContent
					showCloseButton={state.status !== "downloading"}
					className="border-2 border-foreground shadow-[4px_4px_0px_0px_var(--nb-shadow)] sm:max-w-xl gap-5"
				>
					{dialogMeta && (
						<UpdateDialogContent
							meta={dialogMeta}
							isDownloading={state.status === "downloading"}
							progress={state.status === "downloading" ? state.progress : 0}
							isReady={state.status === "ready-to-install"}
							onDownload={handleStartDownload}
							onInstall={() => void installAndRelaunch()}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
