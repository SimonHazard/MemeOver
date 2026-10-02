import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { EASE_OUT } from "@memeover/ui/lib/motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { emit } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { motion, useReducedMotion } from "framer-motion";
import { Check, CircleHelp, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { type DiagResult, requestDiag } from "@/shared/diagnostics";
import { showOverlay } from "@/shared/helpers";
import { useAvailableMonitors } from "@/shared/hooks/useAvailableMonitors";
import { DISCORD_DEVELOPER_PORTAL_URL, DISCORD_INVITE_PERMISSIONS } from "@/shared/server-creator";
import { loadSettings, patchSettings } from "@/shared/settings";
import { useAppStore } from "@/shared/store";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { buildDiagnosticChecklist, type DiagnosticFix } from "./checklist";
import { TraceList } from "./trace-list";

const icons = {
	ok: Check,
	warn: TriangleAlert,
	fail: X,
	unknown: CircleHelp,
	pending: LoaderCircle,
};
export function DiagnosticsPanel() {
	const { t, i18n } = useTranslation(),
		navigate = useNavigate(),
		queryClient = useQueryClient();
	const { data: settings = DEFAULT_SETTINGS } = useQuery({
		queryKey: ["settings"],
		queryFn: loadSettings,
	});
	const wsStatus = useAppStore((s) => s.wsStatus),
		lastJoinError = useAppStore((s) => s.lastJoinError),
		overlayHealth = useAppStore((s) => s.overlayHealth),
		guildPausedUntil = useAppStore((s) => s.guildPausedUntil);
	const monitors = useAvailableMonitors(),
		reduced = useReducedMotion();
	const [hasRun, setHasRun] = useState(false),
		[running, setRunning] = useState(false),
		[cooldown, setCooldown] = useState(false),
		[diag, setDiag] = useState<DiagResult | null>(null);
	const mounted = useRef(true),
		cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
		};
	}, []);
	const run = async () => {
		if (running || cooldown) return;
		setHasRun(true);
		setRunning(true);
		setCooldown(true);
		setDiag(null);
		cooldownTimer.current = setTimeout(() => {
			if (mounted.current) setCooldown(false);
		}, 5000);
		const result = await requestDiag();
		if (mounted.current) {
			setDiag(result);
			setRunning(false);
		}
	};
	const fix = async (action: DiagnosticFix) => {
		try {
			switch (action) {
				case "goto-setup":
					document.getElementById("guildId")?.focus();
					break;
				case "copy-setup-command":
					await navigator.clipboard.writeText("/memeover setup");
					toast.success(t("diagnostics.copied"));
					break;
				case "open-reauthorize": {
					if (!diag?.ok) return;
					const url = new URL("https://discord.com/oauth2/authorize");
					url.search = new URLSearchParams({
						client_id: diag.diag.client_id,
						permissions: String(DISCORD_INVITE_PERMISSIONS),
						scope: "bot applications.commands",
						guild_id: settings.guildId,
						disable_guild_select: "true",
					}).toString();
					await openUrl(url.toString());
					break;
				}
				case "open-dev-portal":
					await openUrl(DISCORD_DEVELOPER_PORTAL_URL);
					break;
				case "show-overlay":
					await showOverlay();
					break;
				case "fix-display":
					await patchSettings((s) => ({
						...s,
						enabledTypes: Object.values(s.enabledTypes).some(Boolean)
							? s.enabledTypes
							: { ...DEFAULT_SETTINGS.enabledTypes },
						mediaOpacity: s.mediaOpacity === 0 ? 100 : s.mediaOpacity,
						mediaSize: s.mediaSize <= 15 ? DEFAULT_SETTINGS.mediaSize : s.mediaSize,
						volume: s.volume === 0 ? DEFAULT_SETTINGS.volume : s.volume,
					}));
					await queryClient.invalidateQueries({ queryKey: ["settings"] });
					break;
				case "manage-muted":
					await navigate({ to: "/history" });
					break;
			}
		} catch {
			toast.error(t("diagnostics.actionFailed"));
		}
	};
	const rows = buildDiagnosticChecklist({
		settings,
		wsStatus,
		lastJoinError,
		overlayHealth,
		monitors,
		diag,
		guildPausedUntil,
	});
	return (
		<NbCard className="space-y-4">
			<div className="flex items-center justify-between gap-3">
				<h2 className="font-display text-base tracking-wide">{t("diagnostics.title")}</h2>
				<NbButton size="sm" disabled={running || cooldown} onClick={() => void run()}>
					{t(running ? "diagnostics.running" : "diagnostics.run")}
				</NbButton>
			</div>
			{hasRun && (
				<ul className="space-y-3" aria-live="polite" aria-busy={running}>
					{rows.map((row, index) => {
						const Icon = icons[row.status];
						return (
							<li key={row.id} className="flex items-start gap-2">
								<motion.span
									key={row.status}
									initial={reduced ? false : { opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{
										duration: reduced ? 0 : 0.18,
										ease: EASE_OUT,
										delay: reduced || row.status === "pending" ? 0 : index * 0.04,
									}}
									className="shrink-0 pt-0.5"
								>
									<Icon
										size={16}
										className={row.status === "pending" ? "motion-safe:animate-spin" : ""}
										aria-hidden="true"
									/>
								</motion.span>
								<div className="flex-1 min-w-0 text-sm">
									<div className="font-display">
										{t(row.labelKey)}{" "}
										<span className="font-text text-xs text-muted-foreground">
											{t(`diagnostics.status.${row.status}`)}
										</span>
									</div>
									{row.detail && (
										<p className="text-xs break-words text-muted-foreground">{row.detail}</p>
									)}
									{row.detailKey && (
										<p className="text-xs text-muted-foreground">
											{t(row.detailKey, { count: row.count })}
											{row.id === "pause" &&
											guildPausedUntil &&
											guildPausedUntil !== Number.MAX_SAFE_INTEGER
												? ` · ${new Date(guildPausedUntil).toLocaleTimeString(i18n.language)}`
												: ""}
										</p>
									)}
								</div>
								{row.fix && (
									<NbButton
										variant="outline"
										size="sm"
										onClick={() => {
											if (row.fix) void fix(row.fix);
										}}
									>
										{t(`diagnostics.fixes.${row.fix}`)}
									</NbButton>
								)}
							</li>
						);
					})}
				</ul>
			)}
			<NbButton
				variant="outline"
				size="sm"
				onClick={() => {
					void emit("diagnostic-test").catch(() => toast.error(t("diagnostics.actionFailed")));
				}}
			>
				{t("diagnostics.localTest")}
			</NbButton>
			<TraceList />
		</NbCard>
	);
}
