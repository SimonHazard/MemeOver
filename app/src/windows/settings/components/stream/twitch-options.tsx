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
import type { RewardsResult } from "@/shared/twitch/helix";
import { TWITCH_ROLES, type TwitchOptions, type TwitchRole } from "@/shared/twitch/options";
import type { TwitchStatus } from "@/shared/twitch/status";

const SWITCHES = ["enabled", "emoteReactions", "mediaCommand", "textCommand", "alerts"] as const;

export function TwitchOptionsPanel() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const { data: settings } = useQuery({
		queryKey: ["settings"],
		queryFn: loadSettings,
		staleTime: 0,
	});
	const status = useTauriEvent<TwitchStatus>("twitch-status-changed");
	const rewards = useTauriEvent<RewardsResult>("twitch-rewards-changed");
	const { mutate, isPending } = useMutation({
		mutationFn: (patch: Partial<TwitchOptions>) =>
			patchSettings((saved) => ({ ...saved, twitch: { ...saved.twitch, ...patch } })),
		onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["settings"] }),
		onError: () => toast.error(t("toast.settingsError")),
	});
	useEffect(() => {
		void emitIfTauri("twitch-rewards-request").catch(() => {});
	}, []);
	if (!settings) return null;
	const options = settings.twitch;
	const rewardItems = [
		{ value: "", label: t("stream.twitch.noReward"), disabled: false },
		...(rewards?.status === "ok"
			? rewards.rewards.map((reward) => ({
					value: reward.id,
					label: reward.title,
					disabled: !reward.needsInput,
				}))
			: []),
	];
	if (options.rewardId && !rewardItems.some((item) => item.value === options.rewardId)) {
		rewardItems.push({
			value: options.rewardId,
			label: t("stream.twitch.savedReward"),
			disabled: true,
		});
	}
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
							checked={options[key]}
							disabled={isPending}
							onCheckedChange={(value) => mutate({ [key]: value })}
						/>
					</div>
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
			{rewards?.status === "unavailable" ? (
				<p className="text-sm font-text text-muted-foreground">
					{t("stream.twitch.rewardsUnavailable")}
				</p>
			) : (
				<div className="flex flex-col gap-2">
					<Label htmlFor="twitch-reward">{t("stream.twitch.reward")}</Label>
					<Select
						items={rewardItems}
						value={options.rewardId}
						disabled={isPending}
						onValueChange={(value) => {
							if (value !== null) mutate({ rewardId: value });
						}}
					>
						<SelectTrigger id="twitch-reward" className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{rewardItems.map(({ value, label, disabled }) => (
									<SelectItem key={value} value={value} disabled={disabled}>
										{label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
					<p className="text-xs font-text text-muted-foreground">
						{t("stream.twitch.rewardInputHint")}
					</p>
				</div>
			)}
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
