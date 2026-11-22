import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { Label } from "@memeover/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@memeover/ui/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { loadAccountRewards } from "@/shared/twitch/account-rewards";

export function TwitchRewards({
	account,
	rewardId,
	saving,
	onChange,
}: {
	account: { login: string; userId: string };
	rewardId: string;
	saving: boolean;
	onChange: (rewardId: string) => void;
}) {
	const { t } = useTranslation();
	const rewardSelectId = useId();
	const setupId = useId();
	const headingId = useId();
	const { data, isFetching, isError, refetch } = useQuery({
		queryKey: ["twitch-rewards", account.userId],
		queryFn: ({ signal }) => loadAccountRewards(account.userId, signal),
		retry: false,
	});
	const rewards = !isError && data?.status === "ok" ? data.rewards : [];
	const items = [
		{ value: "", label: t("stream.twitch.noReward"), disabled: false },
		...rewards
			.filter((reward) => reward.enabled && reward.needsInput)
			.map((reward) => ({ value: reward.id, label: reward.title, disabled: false })),
	];
	const hasEligibleRewards = items.length > 1;
	if (rewardId && !items.some((item) => item.value === rewardId)) {
		items.push({
			value: rewardId,
			label: t("stream.twitch.savedReward"),
			disabled: true,
		});
	}
	const status = isFetching
		? "loading"
		: isError
			? "failed"
			: data?.status === "ok"
				? hasEligibleRewards
					? undefined
					: "empty"
				: data?.status;
	const dashboardUrl = `https://dashboard.twitch.tv/u/${encodeURIComponent(account.login)}/viewer-rewards/channel-points/rewards`;

	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-2 border-y py-3">
			<h3 id={headingId} className="font-display text-sm">
				{t("stream.twitch.channelPoints")}
			</h3>
			<p id={setupId} className="text-sm font-text text-muted-foreground">
				{t("stream.twitch.rewardSetup")}
			</p>
			<div className="flex flex-wrap gap-2">
				<NbButton
					type="button"
					variant="outline"
					onClick={() =>
						void openUrl(dashboardUrl).catch(() => toast.error(t("stream.twitch.dashboardError")))
					}
				>
					{t("stream.twitch.openDashboard")}
				</NbButton>
				<NbButton
					type="button"
					variant="outline"
					disabled={isFetching}
					onClick={() => void refetch()}
				>
					{t("stream.twitch.refreshRewards")}
				</NbButton>
			</div>
			<p role="status" className="text-sm font-text text-muted-foreground">
				{status ? t(`stream.twitch.rewardStatus.${status}`) : null}
			</p>
			<Label htmlFor={rewardSelectId}>{t("stream.twitch.reward")}</Label>
			<Select
				items={items}
				value={rewardId}
				disabled={saving || isFetching || (!hasEligibleRewards && !rewardId)}
				onValueChange={(value) => {
					if (value !== null) onChange(value);
				}}
			>
				<SelectTrigger id={rewardSelectId} aria-describedby={setupId} className="w-full">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{items.map(({ value, label, disabled }) => (
							<SelectItem key={value} value={value} disabled={disabled}>
								{label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			<p className="text-sm font-text text-muted-foreground">{t("stream.twitch.rewardRedeem")}</p>
			<p className="text-xs font-text text-muted-foreground">{t("stream.twitch.rewardQueue")}</p>
		</section>
	);
}
