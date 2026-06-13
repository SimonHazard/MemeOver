import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { create } from "zustand";
import {
	createDiscordInviteUrl,
	createFriendSetupCode,
	createPublicWsUrl,
	DISCORD_DEVELOPER_PORTAL_URL,
	parseServerSetupCode,
	SERVER_CREATOR_DEFAULT_PORT,
	serverCreatorInstall,
	serverCreatorInstallBun,
	serverCreatorLogs,
	serverCreatorPublicIp,
	serverCreatorRestart,
	serverCreatorStart,
	serverCreatorStatus,
	serverCreatorStop,
} from "@/shared/server-creator";
import { loadSettings, persistSettings } from "@/shared/settings";
import type { ServerStep } from "@/windows/settings/components/server/types";

function mutationError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

interface ServerFormFields {
	installDir: string;
	discordToken: string;
	discordClientId: string;
	port: string;
	publicWsUrl: string;
	setupCode: string;
	guildId: string;
	guildToken: string;
	administratorInvite: boolean;
}

/** Module-level store so wizard inputs (token included) survive tab
 *  navigation — the page unmounts and useState would wipe them. */
const useServerFormStore = create<
	ServerFormFields & {
		setField: <K extends keyof ServerFormFields>(key: K, value: ServerFormFields[K]) => void;
	}
>((set) => ({
	installDir: "",
	discordToken: "",
	discordClientId: "",
	port: String(SERVER_CREATOR_DEFAULT_PORT),
	publicWsUrl: createPublicWsUrl("YOUR_PUBLIC_IP", SERVER_CREATOR_DEFAULT_PORT),
	setupCode: "",
	guildId: "",
	guildToken: "",
	administratorInvite: false,
	setField: (key, value) => set({ [key]: value } as Partial<ServerFormFields>),
}));

export function useServerPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const {
		installDir,
		discordToken,
		discordClientId,
		port,
		publicWsUrl,
		setupCode,
		guildId,
		guildToken,
		administratorInvite,
		setField,
	} = useServerFormStore();
	const setInstallDir = (value: string) => setField("installDir", value);
	const setPublicWsUrl = (value: string) => setField("publicWsUrl", value);

	const wsPort = Number.parseInt(port, 10) || SERVER_CREATOR_DEFAULT_PORT;
	const statusKeyInstallDir = installDir.trim() || undefined;

	const { data: status, isLoading: statusLoading } = useQuery({
		queryKey: ["serverCreatorStatus", statusKeyInstallDir, wsPort],
		queryFn: () => serverCreatorStatus(statusKeyInstallDir, wsPort),
		refetchInterval: 2_000,
		placeholderData: keepPreviousData,
	});

	const { data: logs = [], isLoading: logsLoading } = useQuery({
		queryKey: ["serverCreatorLogs"],
		queryFn: serverCreatorLogs,
		refetchInterval: 2_000,
		placeholderData: keepPreviousData,
	});

	useEffect(() => {
		if (!installDir && status?.defaultInstallDir) {
			setField("installDir", status.defaultInstallDir);
		}
	}, [installDir, status?.defaultInstallDir, setField]);

	const inviteUrl = useMemo(
		() => createDiscordInviteUrl(discordClientId, administratorInvite),
		[administratorInvite, discordClientId],
	);
	const friendSetupCode = useMemo(
		() => createFriendSetupCode({ guildId, token: guildToken, wsUrl: publicWsUrl }),
		[guildId, guildToken, publicWsUrl],
	);
	const progress = useMemo(() => {
		const checks = [
			!!discordToken && !!inviteUrl,
			!!installDir && !!publicWsUrl,
			!!status?.installed && !!status?.configured,
			!!status?.running || !!status?.healthy,
			!!guildId && !!guildToken,
			!!friendSetupCode,
		];
		return (checks.filter(Boolean).length / checks.length) * 100;
	}, [
		discordToken,
		friendSetupCode,
		guildId,
		guildToken,
		installDir,
		inviteUrl,
		publicWsUrl,
		status?.configured,
		status?.healthy,
		status?.installed,
		status?.running,
	]);

	const steps: ServerStep[] = [
		{
			title: t("server.steps.discord"),
			state: discordToken && inviteUrl ? "done" : "active",
		},
		{
			title: t("server.steps.configure"),
			state: installDir && publicWsUrl ? "done" : discordToken ? "active" : "idle",
		},
		{
			title: t("server.steps.install"),
			state: status?.installed && status?.configured ? "done" : installDir ? "active" : "idle",
		},
		{
			title: t("server.steps.run"),
			state: status?.running || status?.healthy ? "done" : status?.installed ? "active" : "idle",
		},
		{
			title: t("server.steps.connect"),
			state:
				guildId && guildToken ? "done" : status?.running || status?.healthy ? "active" : "idle",
		},
		{
			title: t("server.steps.share"),
			state: friendSetupCode ? "done" : guildId && guildToken ? "active" : "idle",
		},
	];

	const invalidateServer = () => {
		void queryClient.invalidateQueries({ queryKey: ["serverCreatorStatus"] });
		void queryClient.invalidateQueries({ queryKey: ["serverCreatorLogs"] });
	};

	const installBunMutation = useMutation({
		mutationFn: serverCreatorInstallBun,
		onSuccess: () => {
			toast.success(t("server.toast.bunInstalled"));
			invalidateServer();
		},
		onError: (error) => toast.error(mutationError(error)),
	});

	const installMutation = useMutation({
		mutationFn: (repair: boolean) =>
			serverCreatorInstall({
				installDir,
				discordToken,
				discordClientId,
				wsPort,
				publicWsUrl,
				repair,
			}),
		onSuccess: (result) => {
			setInstallDir(result.installDir);
			toast.success(t("server.toast.installed"));
			invalidateServer();
		},
		onError: (error) => toast.error(mutationError(error)),
	});

	const startMutation = useMutation({
		mutationFn: () => serverCreatorStart(installDir),
		onSuccess: () => {
			toast.success(t("server.toast.started"));
			invalidateServer();
		},
		onError: (error) => toast.error(mutationError(error)),
	});

	const stopMutation = useMutation({
		mutationFn: serverCreatorStop,
		onSuccess: () => {
			toast.success(t("server.toast.stopped"));
			invalidateServer();
		},
		onError: (error) => toast.error(mutationError(error)),
	});

	const restartMutation = useMutation({
		mutationFn: () => serverCreatorRestart(installDir),
		onSuccess: () => {
			toast.success(t("server.toast.restarted"));
			invalidateServer();
		},
		onError: (error) => toast.error(mutationError(error)),
	});

	const detectIpMutation = useMutation({
		mutationFn: serverCreatorPublicIp,
		onSuccess: (ip) => {
			setPublicWsUrl(createPublicWsUrl(ip, wsPort));
			toast.success(t("server.toast.ipDetected"));
			invalidateServer();
		},
		onError: (error) => toast.error(mutationError(error)),
	});

	async function chooseInstallDir() {
		const selected = await openDialog({
			directory: true,
			multiple: false,
			defaultPath: installDir || status?.defaultInstallDir,
		});
		if (typeof selected === "string") {
			setInstallDir(selected);
		}
	}

	async function copyText(value: string, message: string) {
		await navigator.clipboard.writeText(value);
		toast.success(message);
	}

	async function applySetupCode() {
		const parsed = parseServerSetupCode(setupCode);
		if (!parsed) {
			toast.error(t("toast.connectionImportError"));
			return;
		}

		const localWsUrl = `ws://localhost:${wsPort}/ws`;
		const current = await queryClient.fetchQuery({
			queryKey: ["settings"],
			queryFn: loadSettings,
		});
		await persistSettings({
			...current,
			wsUrl: localWsUrl,
			expertMode: true,
			guildId: parsed.guildId,
			token: parsed.token,
		});
		setField("guildId", parsed.guildId);
		setField("guildToken", parsed.token);
		void queryClient.invalidateQueries({ queryKey: ["settings"] });
		toast.success(t("server.toast.connected"));
	}

	const installDisabled =
		!installDir ||
		!discordToken ||
		!inviteUrl ||
		!publicWsUrl ||
		installMutation.isPending ||
		installBunMutation.isPending;

	return {
		administratorInvite,
		detectIpPending: detectIpMutation.isPending,
		discordClientId,
		discordToken,
		friendSetupCode,
		installBunPending: installBunMutation.isPending,
		installDir,
		installDisabled,
		installPending: installMutation.isPending,
		inviteUrl,
		logs,
		logsLoading,
		port,
		progress,
		publicWsUrl,
		restartPending: restartMutation.isPending,
		setupCode,
		startPending: startMutation.isPending,
		status,
		statusLoading,
		steps,
		stopPending: stopMutation.isPending,
		wsPort,
		actions: {
			applySetupCode: () => void applySetupCode(),
			chooseInstallDir: () => void chooseInstallDir(),
			copyInvite: () => inviteUrl && void copyText(inviteUrl, t("server.toast.inviteCopied")),
			copySetupCode: () =>
				friendSetupCode && void copyText(friendSetupCode, t("server.toast.setupCopied")),
			detectIp: () => detectIpMutation.mutate(),
			install: () => installMutation.mutate(false),
			installBun: () => installBunMutation.mutate(),
			openInvite: () => inviteUrl && void openUrl(inviteUrl),
			openPortal: () => void openUrl(DISCORD_DEVELOPER_PORTAL_URL),
			repair: () => installMutation.mutate(true),
			restart: () => restartMutation.mutate(),
			setAdministratorInvite: (value: boolean) => setField("administratorInvite", value),
			setDiscordClientId: (value: string) => setField("discordClientId", value),
			setDiscordToken: (value: string) => setField("discordToken", value),
			setInstallDir,
			setPort: (value: string) => setField("port", value),
			setPublicWsUrl,
			setSetupCode: (value: string) => setField("setupCode", value),
			start: () => startMutation.mutate(),
			stop: () => stopMutation.mutate(),
		},
	};
}
