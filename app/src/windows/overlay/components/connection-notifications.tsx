import { Toaster } from "@memeover/ui/components/ui/sonner";
import { Users } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import i18n from "@/i18n";
import { useAppStore } from "@/shared/store";

const TOASTER_ID = "overlay-connections";
let activeToastId: string | number | undefined;

export function dismissConnectionNotification() {
	if (activeToastId === undefined) return;
	toast.dismiss(activeToastId);
	activeToastId = undefined;
}

export function showConnectionNotification(count: number) {
	activeToastId = toast(i18n.t("overlay.userConnected", { count }), {
		id: activeToastId,
		toasterId: TOASTER_ID,
		icon: <Users className="size-5 shrink-0" aria-hidden="true" />,
		duration: 4000,
		onAutoClose: ({ id }) => {
			if (activeToastId === id) activeToastId = undefined;
		},
	});
}

export function ConnectionNotifications() {
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
			theme="light"
			position={position}
			className="overlay-connection-toaster pointer-events-none"
			containerAriaLabel={t("display.group_notifications")}
			hotkey={[]}
			visibleToasts={1}
			offset={24}
			mobileOffset={24}
			toastOptions={{
				style: {
					background: "var(--popover)",
					color: "var(--popover-foreground)",
					border: "2px solid var(--foreground)",
					borderRadius: 0,
					boxShadow: "4px 4px 0 var(--nb-shadow)",
					fontFamily: "var(--font-sans)",
				},
			}}
		/>
	);
}
