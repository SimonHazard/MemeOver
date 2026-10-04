import { NbButton } from "@memeover/ui/components/branded/nb-button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@memeover/ui/components/ui/dialog";
import { NB_SHADOW_SM } from "@memeover/ui/lib/nb-classes";
import { Gamepad2 } from "lucide-react";
import { useTranslation } from "react-i18next";

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * Trigger button + Dialog that surfaces the fullscreen compatibility notice
 * on demand from the About page — for users who dismissed the original notice.
 */
export function FullscreenInfoDialog() {
	const { t } = useTranslation();

	return (
		<Dialog>
			<DialogTrigger render={<NbButton variant="outline" size="sm" />}>
				{t("notice.show_info")}
			</DialogTrigger>

			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div
							className={`size-9 rounded-lg bg-primary border-2 border-foreground flex items-center justify-center ${NB_SHADOW_SM} shrink-0`}
						>
							<Gamepad2 className="size-4 text-primary-foreground" />
						</div>
						<DialogTitle>{t("notice.fullscreen_title")}</DialogTitle>
					</div>
				</DialogHeader>

				<DialogDescription render={<div />} className="space-y-3 text-sm leading-relaxed">
					<p>{t("notice.fullscreen_body")}</p>
					<p className="text-amber-700 dark:text-amber-400 font-medium">
						{t("notice.fullscreen_fix")}
					</p>
				</DialogDescription>

				<DialogFooter>
					<DialogClose render={<NbButton variant="outline" size="sm" />}>
						{t("notice.fullscreen_dismiss")}
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
