import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { Alert, AlertDescription } from "@memeover/ui/components/ui/alert";
import { NB_SHADOW_SM } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import { openUrl } from "@tauri-apps/plugin-opener";
import { FlaskConical, MessageSquare } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { isTwitchConfigured } from "@/shared/twitch/config";
import { TwitchOptionsPanel } from "./twitch-options";
import { useTwitchConnect } from "./use-twitch-connect";

export function TwitchCard() {
	if (!isTwitchConfigured()) return null;
	return <ConfiguredTwitchCard />;
}

function ConfiguredTwitchCard() {
	const { t } = useTranslation();
	const alphaNoticeId = useId();
	const { account, loading, state, connect, cancel, disconnect, disconnecting } =
		useTwitchConnect();
	return (
		<NbCard>
			<div className="flex flex-col gap-3">
				<div className="flex items-start gap-4">
					<div className={cn("p-2.5 border-2 border-foreground shrink-0", NB_SHADOW_SM)}>
						<MessageSquare className="size-5" aria-hidden="true" />
					</div>
					<div className="min-w-0 flex-1">
						<h2 className="font-display text-base tracking-wide">{t("stream.twitch.title")}</h2>
						<p className="mt-1 text-sm font-text text-muted-foreground">
							{t("stream.twitch.desc")}
						</p>
					</div>
				</div>
				<Alert
					role="note"
					className="border-2 border-foreground bg-secondary-100 dark:bg-secondary-950"
				>
					<FlaskConical aria-hidden="true" />
					<AlertDescription id={alphaNoticeId} className="text-foreground">
						<strong className="font-display">{t("stream.twitch.alphaTitle")}</strong>
						<p>{t("stream.twitch.alphaNotice")}</p>
					</AlertDescription>
				</Alert>
				{account ? (
					<div className="flex flex-wrap items-center gap-3">
						<p role="status" className="text-sm font-text">
							{t("stream.twitch.connected", { login: account.login })}
						</p>
						<NbButton
							type="button"
							variant="outline"
							disabled={disconnecting}
							onClick={() => void disconnect()}
						>
							{t("stream.twitch.disconnect")}
						</NbButton>
					</div>
				) : state.phase === "awaiting_user" ? (
					<div className="flex flex-col gap-3">
						<p
							role="status"
							className="border-2 border-foreground p-3 text-center font-mono text-2xl tracking-widest"
						>
							{state.userCode}
						</p>
						<p className="text-sm font-text">{t("stream.twitch.enterCode")}</p>
						<div className="flex flex-wrap gap-3">
							<NbButton
								type="button"
								onClick={() =>
									void openUrl(state.verificationUri).catch(() =>
										toast.error(t("toast.settingsError")),
									)
								}
							>
								{t("stream.twitch.openAgain")}
							</NbButton>
							<NbButton type="button" variant="outline" onClick={cancel}>
								{t("stream.twitch.cancel")}
							</NbButton>
						</div>
					</div>
				) : (
					<div className="flex flex-col items-start gap-3">
						{state.phase === "failed" ? (
							<p role="alert" className="text-sm font-text">
								{t(`stream.twitch.errors.${state.reason}`)}
							</p>
						) : null}
						<NbButton
							type="button"
							aria-describedby={alphaNoticeId}
							disabled={loading || state.phase === "starting"}
							onClick={() => void connect()}
						>
							{state.phase === "starting"
								? t("stream.twitch.starting")
								: state.phase === "failed"
									? t("stream.twitch.retry")
									: t("stream.twitch.connect")}
						</NbButton>
						{state.phase === "starting" ? (
							<NbButton type="button" variant="outline" onClick={cancel}>
								{t("stream.twitch.cancel")}
							</NbButton>
						) : null}
					</div>
				)}
				<p className="text-xs font-text text-muted-foreground">{t("stream.twitch.permissions")}</p>
				{account ? <TwitchOptionsPanel alphaNoticeId={alphaNoticeId} /> : null}
			</div>
		</NbCard>
	);
}
