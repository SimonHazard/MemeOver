import { NbSwitch } from "@memeover/ui/components/branded/nb-switch";
import { Label } from "@memeover/ui/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@memeover/ui/components/ui/toggle-group";
import { NB_TOGGLE_ITEM } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import { useTranslation } from "react-i18next";
import { CONNECTION_NOTIFICATION_POSITIONS } from "@/shared/types";
import { SectionHeader } from "../components/section-header";
import { useOverlayFormContext } from "../form-hook";

export function NotificationsSection() {
	const form = useOverlayFormContext();
	const { t } = useTranslation();

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
					<form.Field name="connectionNotificationPosition">
						{(field) => (
							<fieldset disabled={!enabled} className="flex flex-col gap-3 disabled:opacity-50">
								<legend className="mb-3 font-display tracking-wide text-xs">
									{t("display.connection_notification_position")}
								</legend>
								<ToggleGroup
									aria-label={t("display.connection_notification_position")}
									disabled={!enabled}
									value={[field.state.value]}
									onValueChange={([value]) => {
										if (value) field.handleChange(value);
									}}
									className="grid w-full grid-cols-2 gap-2"
								>
									{CONNECTION_NOTIFICATION_POSITIONS.map((position) => (
										<ToggleGroupItem
											key={position}
											value={position}
											className={cn(NB_TOGGLE_ITEM, "w-full")}
										>
											{t(`display.position_${position.replace("-", "_")}`)}
										</ToggleGroupItem>
									))}
								</ToggleGroup>
							</fieldset>
						)}
					</form.Field>
				)}
			</form.Subscribe>
		</div>
	);
}
