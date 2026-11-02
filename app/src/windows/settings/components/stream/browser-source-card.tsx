import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { NbSwitch } from "@memeover/ui/components/branded/nb-switch";
import { Input } from "@memeover/ui/components/ui/input";
import { Label } from "@memeover/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@memeover/ui/components/ui/select";
import { Separator } from "@memeover/ui/components/ui/separator";
import { NB_SHADOW_SM } from "@memeover/ui/lib/nb-classes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { relaunch } from "@tauri-apps/plugin-process";
import { Eye, EyeOff, MonitorPlay, RotateCcw, TriangleAlert } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CopyButton } from "@/components/motion/copy-button";
import {
	type BrowserSourceProfileChoice,
	browserSourceNeedsRestart,
	browserSourceOrigin,
	buildBrowserSourceUrl,
	isValidBrowserSourcePort,
	maskBrowserSourceUrl,
	resolveBrowserSourceProfile,
} from "@/shared/browser-source";
import { loadOverlayProfiles } from "@/shared/profiles";
import { loadSettings, patchSettings } from "@/shared/settings";
import { useAppStore } from "@/shared/store";
import { refreshBrowserSourceStatus, startBrowserSource } from "@/shared/stream-controls";
import type { Settings } from "@/shared/types";

// ─── Sub-components ───────────────────────────────────────────────────────────

function Notice({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "warn" }) {
	return (
		<p
			className={`flex gap-2 text-xs font-text ${tone === "warn" ? "text-destructive" : "text-muted-foreground"}`}
		>
			<TriangleAlert className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
			<span>{children}</span>
		</p>
	);
}

function RestartNotice() {
	const { t } = useTranslation();
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 border-2 border-foreground p-3">
			<p className="text-xs font-text">{t("stream.browserSource.restartNotice")}</p>
			<NbButton size="sm" variant="outline" onClick={() => void relaunch()}>
				<RotateCcw className="size-3.5" aria-hidden="true" />
				{t("stream.browserSource.restartNow")}
			</NbButton>
		</div>
	);
}

function BrowserSourceLink({ settings, runningPort }: { settings: Settings; runningPort: number }) {
	const { t } = useTranslation();
	const [revealed, setRevealed] = useState(false);
	const [choice, setChoice] = useState<BrowserSourceProfileChoice>("current");
	const { data: profiles = [] } = useQuery({
		queryKey: ["overlayProfiles"],
		queryFn: loadOverlayProfiles,
	});

	// `tauri dev` loads the frontend from Vite, not from embedded assets: in a debug
	// build the plugin would serve a stale `app/dist`. Point the browser at Vite instead.
	const origin = import.meta.env.DEV ? window.location.origin : browserSourceOrigin(runningPort);
	const url = buildBrowserSourceUrl({
		origin,
		guildId: settings.guildId,
		token: settings.token,
		wsUrl: settings.wsUrl,
		profile: resolveBrowserSourceProfile(choice, settings, profiles),
	});

	return (
		<div className="space-y-3">
			<div className="flex flex-col gap-2">
				<Label htmlFor="browser-source-url" className="font-display tracking-wide text-xs">
					{t("stream.browserSource.urlLabel")}
				</Label>
				<div className="flex gap-2">
					<Input
						id="browser-source-url"
						readOnly
						value={revealed ? url : maskBrowserSourceUrl(url)}
						className="font-mono text-xs"
						onFocus={(event) => event.currentTarget.select()}
					/>
					<NbButton
						size="icon"
						variant="outline"
						aria-pressed={revealed}
						aria-label={t(
							revealed ? "stream.browserSource.hideUrl" : "stream.browserSource.showUrl",
						)}
						onClick={() => setRevealed((value) => !value)}
					>
						{revealed ? (
							<EyeOff className="size-4" aria-hidden="true" />
						) : (
							<Eye className="size-4" aria-hidden="true" />
						)}
					</NbButton>
				</div>
			</div>

			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="flex min-w-48 flex-1 flex-col gap-2">
					<Label htmlFor="browser-source-profile" className="font-display tracking-wide text-xs">
						{t("stream.browserSource.profileLabel")}
					</Label>
					<Select
						value={choice}
						onValueChange={(value) => setChoice(value as BrowserSourceProfileChoice)}
					>
						<SelectTrigger id="browser-source-profile" className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="current">{t("stream.browserSource.profileCurrent")}</SelectItem>
								{profiles.map((profile) => (
									<SelectItem key={profile.id} value={profile.id}>
										{profile.name}
									</SelectItem>
								))}
								<SelectItem value="defaults">
									{t("stream.browserSource.profileDefaults")}
								</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>
				<CopyButton value={url} label={t("stream.browserSource.copyUrl")} size="default" />
			</div>

			<Notice tone="warn">{t("stream.browserSource.secretWarning")}</Notice>
			<Notice>{t("stream.browserSource.copyAgain")}</Notice>
		</div>
	);
}

function RecommendedSourceSettings() {
	const { t } = useTranslation();
	return (
		<section className="space-y-2">
			<h3 className="font-display text-sm tracking-wide">
				{t("stream.browserSource.softwareTitle")}
			</h3>
			<ul className="list-disc space-y-1.5 pl-5 text-sm font-text leading-relaxed">
				<li>{t("stream.browserSource.softwareAdd")}</li>
				<li>{t("stream.browserSource.softwareSize")}</li>
				<li>{t("stream.browserSource.softwareKeepRunning")}</li>
				<li>{t("stream.browserSource.softwareAudio")}</li>
				<li>{t("stream.browserSource.softwareMonitor")}</li>
			</ul>
		</section>
	);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BrowserSourceCard() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: loadSettings });
	const runningPort = useAppStore((s) => s.browserSourceRunningPort);
	const startError = useAppStore((s) => s.browserSourceError);
	const [portDraft, setPortDraft] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		void refreshBrowserSourceStatus().catch((error) =>
			console.warn("[Browser source] Could not read status:", error),
		);
	}, []);

	if (!settings) return null;

	const enabled = settings.browserSourceEnabled;
	const portText = portDraft ?? String(settings.browserSourcePort);
	const draftPort = Number(portText);
	const portValid = isValidBrowserSourcePort(draftPort);
	const needsRestart = browserSourceNeedsRestart(runningPort, settings);
	const serving = enabled && runningPort === settings.browserSourcePort;
	const hasCredentials = Boolean(settings.guildId && settings.token);

	async function save(patch: Partial<Settings>): Promise<Settings | null> {
		try {
			const updated = await patchSettings((s) => ({ ...s, ...patch }));
			await queryClient.invalidateQueries({ queryKey: ["settings"] });
			return updated;
		} catch {
			toast.error(t("toast.settingsError"));
			return null;
		}
	}

	async function toggle(next: boolean) {
		setBusy(true);
		try {
			const updated = await save({ browserSourceEnabled: next });
			if (updated && next) await startBrowserSource(updated.browserSourcePort);
			else useAppStore.setState({ browserSourceError: null });
		} finally {
			setBusy(false);
		}
	}

	async function commitPort() {
		if (!portValid || draftPort === settings?.browserSourcePort) {
			if (portValid) setPortDraft(null);
			return;
		}
		setBusy(true);
		try {
			const updated = await save({ browserSourcePort: draftPort });
			setPortDraft(null);
			if (updated?.browserSourceEnabled && runningPort === null) {
				await startBrowserSource(updated.browserSourcePort);
			}
		} finally {
			setBusy(false);
		}
	}

	const errorMessage =
		startError === "port_in_use"
			? t("stream.browserSource.portInUse", { port: settings.browserSourcePort })
			: startError === "unknown" || startError === "invalid_port"
				? t("stream.browserSource.startError")
				: null;

	return (
		<NbCard>
			<div className="space-y-4">
				<div className="flex items-start gap-4">
					<div className={`p-2.5 border-2 border-foreground ${NB_SHADOW_SM} shrink-0`}>
						<MonitorPlay className="size-5" aria-hidden="true" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-start justify-between gap-4">
							<h2 className="font-display text-base tracking-wide">
								<Label htmlFor="browser-source-enabled">{t("stream.browserSource.title")}</Label>
							</h2>
							<NbSwitch
								id="browser-source-enabled"
								checked={enabled}
								disabled={busy}
								onCheckedChange={(checked) => void toggle(checked)}
							/>
						</div>
						<p className="text-sm font-text text-muted-foreground mt-1">
							{t("stream.browserSource.desc")}
						</p>
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="browser-source-port" className="font-display tracking-wide text-xs">
						{t("stream.browserSource.portLabel")}
					</Label>
					<Input
						id="browser-source-port"
						type="number"
						inputMode="numeric"
						min={1024}
						max={65535}
						value={portText}
						disabled={busy}
						aria-invalid={!portValid}
						onChange={(event) => setPortDraft(event.target.value)}
						onBlur={() => void commitPort()}
						onKeyDown={(event) => {
							if (event.key === "Enter") void commitPort();
						}}
						className="w-32 font-mono"
					/>
					{!portValid && (
						<p className="text-xs text-destructive font-text">
							{t("stream.browserSource.portInvalid")}
						</p>
					)}
				</div>

				{errorMessage && <Notice tone="warn">{errorMessage}</Notice>}
				{needsRestart && <RestartNotice />}

				{serving && runningPort !== null && (
					<>
						<Separator />
						{hasCredentials ? (
							<BrowserSourceLink settings={settings} runningPort={runningPort} />
						) : (
							<Notice>{t("stream.browserSource.missingCredentials")}</Notice>
						)}
						<Separator />
						<RecommendedSourceSettings />
					</>
				)}
			</div>
		</NbCard>
	);
}
