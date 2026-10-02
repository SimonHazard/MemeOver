import type { DiagResult } from "@/shared/diagnostics";
import { DEFAULT_WS_URL, type OverlayHealth, type Settings, type WsStatus } from "@/shared/types";
export type DiagnosticStatus = "ok" | "warn" | "fail" | "unknown" | "pending";
export type DiagnosticFix =
	| "goto-setup"
	| "copy-setup-command"
	| "open-reauthorize"
	| "open-dev-portal"
	| "show-overlay"
	| "fix-display"
	| "manage-muted";
export interface DiagnosticRow {
	id: string;
	status: DiagnosticStatus;
	labelKey: string;
	detail?: string;
	detailKey?: string;
	count?: number;
	fix?: DiagnosticFix;
}
export interface ChecklistInput {
	settings: Settings;
	wsStatus: WsStatus;
	lastJoinError: string | null;
	overlayHealth: OverlayHealth;
	monitors: { position: { x: number; y: number } }[];
	diag: DiagResult | null;
	guildPausedUntil?: number | null;
	now?: number;
}
export function buildDiagnosticChecklist(input: ChecklistInput): DiagnosticRow[] {
	const { settings: s, wsStatus, diag } = input;
	const remote = diag?.ok ? diag.diag : null;
	const unavailable = diag && !diag.ok ? diag.reason : "pending";
	const rows: DiagnosticRow[] = [];
	const add = (id: string, status: DiagnosticStatus, patch: Partial<DiagnosticRow> = {}) =>
		rows.push({ id, status, labelKey: `diagnostics.rows.${id}`, ...patch });
	add(
		"credentials",
		s.guildId && s.token ? "ok" : "fail",
		s.guildId && s.token ? {} : { fix: "goto-setup" },
	);
	add(
		"connection",
		wsStatus === "connected" ? "ok" : wsStatus === "connecting" ? "pending" : "fail",
		{
			detail: input.lastJoinError ?? undefined,
			fix: wsStatus === "connected" ? undefined : "goto-setup",
		},
	);
	add(
		"guild",
		remote ? (remote.registered ? "ok" : "fail") : diag === null ? "pending" : "unknown",
		remote
			? remote.registered
				? {}
				: { fix: "copy-setup-command" }
			: { detailKey: `diagnostics.remote.${unavailable}` },
	);
	if (!remote)
		add("channels", diag === null ? "pending" : "unknown", {
			detailKey: `diagnostics.remote.${unavailable}`,
		});
	else if (remote.all_channels)
		add("channels", (remote.unviewable_channel_count ?? 0) > 0 ? "warn" : "ok", {
			detailKey: "diagnostics.hiddenChannels",
			count: remote.unviewable_channel_count ?? 0,
			fix: (remote.unviewable_channel_count ?? 0) > 0 ? "open-reauthorize" : undefined,
		});
	else {
		const bad = remote.channels.some((c) => c.missing || !c.perms.view),
			history = remote.channels.some((c) => !c.perms.history);
		add("channels", bad ? "fail" : history ? "warn" : "ok", {
			detail: remote.channels.map((c) => c.name ?? c.id).join(", "),
			fix: bad || history ? "open-reauthorize" : undefined,
		});
	}
	add("bot-sources", remote ? "ok" : "unknown", {
		detailKey: remote
			? !remote.allow_bot_app_sources
				? "diagnostics.sourcesServerMuted"
				: !s.showBotAppSources
					? "diagnostics.sourcesLocalMuted"
					: "diagnostics.sourcesAllowed"
			: undefined,
	});
	add(
		"intent",
		remote?.message_content_intent === false
			? "fail"
			: remote?.message_content_intent === true
				? "ok"
				: "unknown",
		{
			fix:
				remote?.message_content_intent === false && s.wsUrl !== DEFAULT_WS_URL
					? "open-dev-portal"
					: undefined,
		},
	);
	const monitorMissing = Boolean(
		s.overlayMonitor &&
			!input.monitors.some(
				(m) => m.position.x === s.overlayMonitor?.x && m.position.y === s.overlayMonitor?.y,
			),
	);
	add("overlay", input.overlayHealth === "closed" ? "fail" : monitorMissing ? "warn" : "ok", {
		fix: input.overlayHealth === "closed" || monitorMissing ? "show-overlay" : undefined,
		detailKey: monitorMissing ? "diagnostics.monitorMissing" : undefined,
	});
	const displayFail = !Object.values(s.enabledTypes).some(Boolean) || s.mediaOpacity === 0;
	const displayWarn = s.mediaSize <= 15 || s.volume === 0;
	add("display", displayFail ? "fail" : displayWarn ? "warn" : "ok", {
		fix: displayFail || displayWarn ? "fix-display" : undefined,
		detailKey: s.volume === 0 ? "diagnostics.silent" : undefined,
	});
	const pause =
		input.guildPausedUntil != null && input.guildPausedUntil > (input.now ?? Date.now());
	add("pause", pause ? "warn" : "ok", pause ? { detailKey: "diagnostics.askResume" } : {});
	add("muted-authors", "ok", {
		fix: s.mutedAuthors.length || s.hideAnonymous ? "manage-muted" : undefined,
		detailKey: s.mutedAuthors.length || s.hideAnonymous ? "diagnostics.authorsFiltered" : undefined,
		count: s.mutedAuthors.length,
	});
	return rows;
}
