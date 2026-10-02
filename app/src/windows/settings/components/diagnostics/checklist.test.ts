import { expect, test } from "bun:test";
import type { DiagMessage } from "@memeover/shared";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { buildDiagnosticChecklist, type ChecklistInput } from "./checklist";

const diag: DiagMessage = {
	type: "DIAG",
	guild_id: "123456789012345678",
	registered: true,
	all_channels: true,
	channels: [],
	unviewable_channel_count: 0,
	allow_bot_app_sources: true,
	message_content_intent: true,
	overlays_connected: 1,
	client_id: "123456789012345679",
};
const base: ChecklistInput = {
	settings: { ...DEFAULT_SETTINGS, guildId: diag.guild_id, token: "token" },
	wsStatus: "connected",
	lastJoinError: null,
	overlayHealth: "alive",
	monitors: [],
	diag: { ok: true, diag },
	now: 100,
};
const row = (id: string, patch: Partial<ChecklistInput> = {}) => {
	const found = buildDiagnosticChecklist({ ...base, ...patch }).find((r) => r.id === id);
	if (!found) throw new Error(`Missing diagnostic row: ${id}`);
	return found;
};
const remote = (patch: Partial<DiagMessage>): Pick<ChecklistInput, "diag"> => ({
	diag: { ok: true, diag: { ...diag, ...patch } },
});
test("healthy rows and no rejected product rows", () => {
	const rows = buildDiagnosticChecklist(base);
	expect(rows.every((r) => r.status === "ok")).toBe(true);
	expect(rows.some((r) => /reaction|rule/.test(r.id))).toBe(false);
});
test("credentials and connection expose actionable failures", () => {
	expect(row("credentials", { settings: DEFAULT_SETTINGS }).status).toBe("fail");
	expect(row("connection", { wsStatus: "error", lastJoinError: "Invalid token" })).toMatchObject({
		status: "fail",
		detail: "Invalid token",
		fix: "goto-setup",
	});
	expect(row("connection", { wsStatus: "connecting" }).status).toBe("pending");
});
test("guild and channel facts distinguish missing, unreadable and history", () => {
	expect(row("guild", remote({ registered: false })).fix).toBe("copy-setup-command");
	expect(row("channels", remote({ unviewable_channel_count: 2 })).status).toBe("warn");
	const c = { id: "c", name: "memes", missing: false, perms: { view: true, history: true } };
	expect(row("channels", remote({ all_channels: false, channels: [c] })).status).toBe("ok");
	expect(
		row("channels", remote({ all_channels: false, channels: [{ ...c, missing: true }] })).status,
	).toBe("fail");
	expect(
		row(
			"channels",
			remote({ all_channels: false, channels: [{ ...c, perms: { view: false, history: true } }] }),
		).status,
	).toBe("fail");
	expect(
		row(
			"channels",
			remote({ all_channels: false, channels: [{ ...c, perms: { view: true, history: false } }] }),
		).status,
	).toBe("warn");
});
test("unsupported remote checks stay unknown", () => {
	for (const id of ["guild", "channels", "intent"])
		expect(row(id, { diag: { ok: false, reason: "unsupported" } }).status).toBe("unknown");
	expect(row("guild", { diag: null }).status).toBe("pending");
});
test("source filters are informational; intent fix only applies to own bot", () => {
	expect(row("bot-sources", remote({ allow_bot_app_sources: false }))).toMatchObject({
		status: "ok",
		detailKey: "diagnostics.sourcesServerMuted",
	});
	expect(
		row("bot-sources", { settings: { ...base.settings, showBotAppSources: false } }).status,
	).toBe("ok");
	expect(row("intent", remote({ message_content_intent: false }))).toMatchObject({
		status: "fail",
		fix: undefined,
	});
	expect(
		row("intent", {
			...remote({ message_content_intent: false }),
			settings: { ...base.settings, wsUrl: "ws://localhost/ws" },
		}).fix,
	).toBe("open-dev-portal");
	expect(row("intent", remote({ message_content_intent: null })).status).toBe("unknown");
});
test("overlay, display, pause and author filters explain local problems", () => {
	expect(row("overlay", { overlayHealth: "closed" }).status).toBe("fail");
	expect(
		row("overlay", { settings: { ...base.settings, overlayMonitor: { x: 100, y: 0 } } }).status,
	).toBe("warn");
	for (const patch of [
		{ mediaOpacity: 0 },
		{
			enabledTypes: {
				image: false,
				gif: false,
				video: false,
				audio: false,
				sticker: false,
				text: false,
			},
		},
	])
		expect(row("display", { settings: { ...base.settings, ...patch } }).status).toBe("fail");
	for (const patch of [{ mediaSize: 15 }, { volume: 0 }])
		expect(row("display", { settings: { ...base.settings, ...patch } }).status).toBe("warn");
	expect(row("pause", { guildPausedUntil: 101 }).status).toBe("warn");
	expect(row("pause", { guildPausedUntil: 99 }).status).toBe("ok");
	expect(row("muted-authors", { settings: { ...base.settings, hideAnonymous: true } }).fix).toBe(
		"manage-muted",
	);
});
