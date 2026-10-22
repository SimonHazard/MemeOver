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
import { Slider } from "@memeover/ui/components/ui/slider";
import { cn } from "@memeover/ui/lib/utils";
import { useTranslation } from "react-i18next";
import { CONNECTION_NOTIFICATION_POSITIONS, DEFAULT_SETTINGS } from "@/shared/types";
import { SectionHeader } from "../components/section-header";
import { useOverlayFormContext } from "../form-hook";

export function NotificationsSection() {
	const form = useOverlayFormContext();
	const { t } = useTranslation();
	const positions = CONNECTION_NOTIFICATION_POSITIONS.map((value) => ({
		value,
		label: t(`display.position_${value.replace("-", "_")}`),
	}));

	return (
		<div className="flex flex-col gap-5">
			<SectionHeader
				title={t("display.group_notifications")}
				hint={t("display.group_notifications_hint")}
			/>
			<form.Field name="connectionNotificationsEnabled">
				{(field) => (
					<div className="flex items-center justify-between gap-4">
						<Label
							htmlFor="connection-notifications"
							className="font-display tracking-wide text-xs"
						>
							{t("display.connection_notifications_enabled")}
						</Label>
						<NbSwitch
							id="connection-notifications"
							checked={field.state.value}
							onCheckedChange={field.handleChange}
						/>
					</div>
				)}
			</form.Field>
			<form.Subscribe selector={(s) => s.values.connectionNotificationsEnabled}>
				{(enabled) => (
					<>
						<form.Field name="connectionNotificationDuration">
							{(field) => (
								<div className={cn("flex flex-col gap-3", !enabled && "opacity-50")}>
									<div className="flex justify-between gap-4">
										<Label
											htmlFor="connection-notification-duration"
											className="font-display tracking-wide text-xs"
										>
											{t("display.connection_notification_duration")}
										</Label>
										<span className="text-sm text-muted-foreground">
											{field.state.value} {t("display.duration_unit")}
										</span>
									</div>
									<Slider
										id="connection-notification-duration"
										aria-label={t("display.connection_notification_duration")}
										disabled={!enabled}
										min={1}
										max={30}
										step={1}
										value={field.state.value}
										onValueChange={(value) =>
											field.handleChange(value ?? DEFAULT_SETTINGS.connectionNotificationDuration)
										}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="connectionNotificationPosition">
							{(field) => (
								<div className={cn("flex flex-col gap-3", !enabled && "opacity-50")}>
									<Label
										htmlFor="connection-notification-position"
										className="font-display tracking-wide text-xs"
									>
										{t("display.connection_notification_position")}
									</Label>
									<Select
										items={positions}
										disabled={!enabled}
										value={field.state.value}
										onValueChange={(value) => {
											if (value) field.handleChange(value);
										}}
									>
										<SelectTrigger id="connection-notification-position" className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{positions.map(({ value, label }) => (
													<SelectItem key={value} value={value}>
														{label}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</>
				)}
			</form.Subscribe>
		</div>
	);
}
