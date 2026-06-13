import { useTranslation } from "react-i18next";
import { DiscordSetupCard } from "@/windows/settings/components/server/discord-setup-card";
import { ServerConfigCard } from "@/windows/settings/components/server/server-config-card";
import { ServerConnectCard } from "@/windows/settings/components/server/server-connect-card";
import { ServerHeader } from "@/windows/settings/components/server/server-header";
import { ServerInstallCard } from "@/windows/settings/components/server/server-install-card";
import { ServerLogsCard } from "@/windows/settings/components/server/server-logs-card";
import { ServerProgressCard } from "@/windows/settings/components/server/server-progress-card";
import { ServerRunCard } from "@/windows/settings/components/server/server-run-card";
import { ServerShareCard } from "@/windows/settings/components/server/server-share-card";
import { ServerStatusCard } from "@/windows/settings/components/server/server-status-card";
import { useServerPage } from "@/windows/settings/hooks/use-server-page";

export function ServerPage() {
	const { t } = useTranslation();
	const server = useServerPage();

	return (
		<div className="h-full overflow-y-auto p-5">
			<div className="mx-auto flex max-w-6xl flex-col gap-5">
				<ServerHeader status={server.status} progress={server.progress} />

				<div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
					<div className="flex flex-col gap-3">
						<ServerProgressCard title={t("server.progress")} steps={server.steps} />
						<ServerStatusCard
							status={server.status}
							loading={server.statusLoading}
							wsPort={server.wsPort}
						/>
					</div>

					<div className="grid gap-5 xl:grid-cols-2">
						<DiscordSetupCard
							discordClientId={server.discordClientId}
							discordToken={server.discordToken}
							administratorInvite={server.administratorInvite}
							inviteUrl={server.inviteUrl}
							onDiscordClientIdChange={server.actions.setDiscordClientId}
							onDiscordTokenChange={server.actions.setDiscordToken}
							onAdministratorInviteChange={server.actions.setAdministratorInvite}
							onOpenPortal={server.actions.openPortal}
							onOpenInvite={server.actions.openInvite}
							onCopyInvite={server.actions.copyInvite}
						/>

						<ServerConfigCard
							installDir={server.installDir}
							port={server.port}
							publicWsUrl={server.publicWsUrl}
							detectIpPending={server.detectIpPending}
							onInstallDirChange={server.actions.setInstallDir}
							onPortChange={server.actions.setPort}
							onPublicWsUrlChange={server.actions.setPublicWsUrl}
							onChooseInstallDir={server.actions.chooseInstallDir}
							onDetectIp={server.actions.detectIp}
						/>

						<ServerInstallCard
							status={server.status}
							installDisabled={server.installDisabled}
							installPending={server.installPending}
							installBunPending={server.installBunPending}
							onInstallBun={server.actions.installBun}
							onInstall={server.actions.install}
							onRepair={server.actions.repair}
						/>

						<ServerRunCard
							status={server.status}
							wsPort={server.wsPort}
							startPending={server.startPending}
							stopPending={server.stopPending}
							restartPending={server.restartPending}
							onStart={server.actions.start}
							onStop={server.actions.stop}
							onRestart={server.actions.restart}
						/>

						<ServerConnectCard
							setupCode={server.setupCode}
							onSetupCodeChange={server.actions.setSetupCode}
							onApplySetupCode={server.actions.applySetupCode}
						/>

						<ServerShareCard
							friendSetupCode={server.friendSetupCode}
							onCopySetupCode={server.actions.copySetupCode}
						/>

						<div className="xl:col-span-2">
							<ServerLogsCard logs={server.logs} loading={server.logsLoading} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
