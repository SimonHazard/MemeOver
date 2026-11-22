import { NbSwitch } from "@memeover/ui/components/branded/nb-switch";
import { Label } from "@memeover/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@memeover/ui/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTauriEvent } from "@/hooks/useTauriEvent";
import { emitIfTauri } from "@/shared/platform-events";
import { loadSettings, patchSettings } from "@/shared/settings";
import { TWITCH_ROLES, type TwitchOptions, type TwitchRole } from "@/shared/twitch/options";
import type { TwitchStatus } from "@/shared/twitch/status";
import { TwitchRewards } from "./twitch-rewards";

const SWITCHES = ["enabled", "emoteReactions", "mediaCommand", "textCommand", "alerts"] as const;

export function TwitchOptionsPanel({
	alphaNoticeId,
	account,
}: {
	alphaNoticeId: string;
	account: { login: string; userId: string };
}) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { data: settings } = useQuery({
		queryKey: ["settings"],
		queryFn: loadSettings,
		staleTime: 0,
	});
	const status = useTauriEvent<TwitchStatus>("twitch-status-changed");
	const { mutate, isPending } = useMutation({
		mutationFn: (patch: Partial<TwitchOptions>) =>
			patchSettings((saved) => ({ ...saved, twitch: { ...saved.twitch, ...patch } })),
		onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["settings"] }),
		onError: () => toast.error(t("toast.settingsError")),
	});
	useEffect(() => {
		void emitIfTauri("twitch-status-request").catch(() => {});
	}, []);
	if (!settings) return null;
	const options = settings.twitch;
	return (
		<div className="flex flex-col gap-4 border-t-2 border-foreground pt-4">
			<p role="status" className="text-sm font-text">
				{t(`stream.twitch.status.${!options.enabled ? "disabled" : (status ?? "connecting")}`)}
			</p>
			{SWITCHES.map((key) => (
				<div key={key} className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-4">
						<Label htmlFor={`twitch-${key}`}>{t(`stream.twitch.options.${key}`)}</Label>
						<NbSwitch
							id={`twitch-${key}`}
							aria-describedby={key === "enabled" ? alphaNoticeId : undefined}
							checked={options[key]}
							disabled={isPending}
							onCheckedChange={(value) => mutate({ [key]: value })}
						/>
					</div>
					{key === "enabled" ? (
						<TwitchRewards
							account={account}
							rewardId={options.rewardId}
							saving={isPending}
							onChange={(rewardId) => mutate({ rewardId })}
						/>
					) : null}
					{key === "mediaCommand" || key === "textCommand" ? (
						<CommandRoleSelect
							id={key === "mediaCommand" ? "mediaMinRole" : "textMinRole"}
							value={key === "mediaCommand" ? options.mediaMinRole : options.textMinRole}
							disabled={isPending || !options[key]}
							onChange={(value) =>
								mutate(key === "mediaCommand" ? { mediaMinRole: value } : { textMinRole: value })
							}
						/>
					) : null}
				</div>
			))}
			<p className="text-xs font-text text-muted-foreground">
				{t("stream.twitch.mediaAndModeration")}
			</p>
			{settings.browserSourceEnabled ? (
				<p className="text-xs font-text text-muted-foreground">
					{t(
						settings.streamDestination === "stream"
							? "stream.twitch.streamOnly"
							: "stream.twitch.desktopOnly",
					)}
				</p>
			) : null}
		</div>
	);
}

function CommandRoleSelect({
	id,
	value,
	disabled,
	onChange,
}: {
	id: string;
	value: TwitchRole;
	disabled: boolean;
	onChange: (value: TwitchRole) => void;
}) {
	const { t } = useTranslation();
	const roles = TWITCH_ROLES.map((role) => ({
		value: role,
		label: t(`stream.twitch.roles.${role}`),
	}));
	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor={`twitch-${id}`}>{t("stream.twitch.minimumRole")}</Label>
			<Select
				items={roles}
				value={value}
				disabled={disabled}
				onValueChange={(role) => {
					if (role) onChange(role);
				}}
			>
				<SelectTrigger id={`twitch-${id}`} className="w-full">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{roles.map((item) => (
							<SelectItem key={item.value} value={item.value}>
								{item.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			{value === "everyone" ? (
				<p className="text-xs font-text text-destructive">{t("stream.twitch.everyoneWarning")}</p>
			) : null}
		</div>
	);
}
