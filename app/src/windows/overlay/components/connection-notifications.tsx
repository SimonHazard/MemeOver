import { Toaster } from "@memeover/ui/components/ui/sonner";
import { cn } from "@memeover/ui/lib/utils";
import { Users } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAppStore } from "@/shared/store";
import { useResolvedTheme } from "@/shared/theme";

const TOASTER_ID = "overlay-connections";
let activeToastId: string | number | undefined;

function ConnectionMessage({ count }: { count: number }) {
	const { t } = useTranslation();
	return t("overlay.userConnected", { count });
}

export function dismissConnectionNotification() {
	if (activeToastId === undefined) return;
	toast.dismiss(activeToastId);
	activeToastId = undefined;
}

export function showConnectionNotification(count: number) {
	activeToastId = toast(<ConnectionMessage count={count} />, {
		id: activeToastId,
		toasterId: TOASTER_ID,
		icon: <Users className="size-5 shrink-0" aria-hidden="true" />,
		duration: useAppStore.getState().settings.connectionNotificationDuration * 1000,
		onAutoClose: ({ id }) => {
			if (activeToastId === id) activeToastId = undefined;
		},
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
			containerAriaLabel={t("display.group_notifications")}
			hotkey={[]}
			visibleToasts={1}
			offset={24}
			mobileOffset={24}
		/>
	);
}
