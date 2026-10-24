import { Toaster } from "@memeover/ui/components/ui/sonner";
import { cn } from "@memeover/ui/lib/utils";
import { Users } from "lucide-react";
import { type CSSProperties, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAppStore } from "@/shared/store";
import { useResolvedTheme } from "@/shared/theme";

const TOASTER_ID = "overlay-connections";

function ConnectionMessage({ count, messageKey }: { count: number; messageKey: string }) {
	const { t } = useTranslation();
	return t(messageKey, { count });
}

export function dismissConnectionNotification() {
	for (const notification of toast.getToasts()) {
		if ("toasterId" in notification && notification.toasterId === TOASTER_ID)
			toast.dismiss(notification.id);
	}
}

export function showConnectionNotification(count: number, messageKey = "overlay.userConnected") {
	toast(<ConnectionMessage count={count} messageKey={messageKey} />, {
		toasterId: TOASTER_ID,
		icon: <Users className="size-4 shrink-0" aria-hidden="true" />,
		duration: useAppStore.getState().settings.connectionNotificationDuration * 1000,
	});
}

export function ConnectionNotifications() {
	const theme = useResolvedTheme();
	const enabled = useAppStore((s) => s.settings.connectionNotificationsEnabled);
	const position = useAppStore((s) => s.settings.connectionNotificationPosition);
	const health = useAppStore((s) => s.overlayHealth);
	const guildId = useAppStore((s) => s.settings.guildId);
	const { t } = useTranslation();

	// Clear toasts on server changes, when hidden/disabled, and on unmount.
	useEffect(() => {
		if (!enabled || health === "closed" || !guildId) dismissConnectionNotification();
		return dismissConnectionNotification;
	}, [enabled, health, guildId]);

	return (
		<Toaster
			id={TOASTER_ID}
			theme={theme}
			position={position}
			className={cn("overlay-connection-toaster pointer-events-none", theme === "dark" && "dark")}
			style={{ "--width": "300px", opacity: 0.8 } as CSSProperties}
			containerAriaLabel={t("display.group_notifications")}
			hotkey={[]}
			expand
			visibleToasts={3}
			offset={24}
			mobileOffset={24}
		/>
	);
}
