import { Button } from "@memeover/ui/components/ui/button";
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
import { Gamepad2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const NB_BTN =
	"border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all font-display tracking-wide text-xs";

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * Trigger button + Dialog that surfaces the fullscreen compatibility notice
 * on demand from the About page — for users who dismissed the original notice.
 */
export function FullscreenInfoDialog() {
	const { t } = useTranslation();

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className={NB_BTN}>
					{t("notice.show_info")}
				</Button>
			</DialogTrigger>

			<DialogContent
				showCloseButton={false}
				className="border-2 border-foreground shadow-[4px_4px_0px_0px_var(--nb-shadow)]"
			>
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="size-9 rounded-lg bg-amber-400 border-2 border-foreground flex items-center justify-center shadow-[2px_2px_0px_0px_var(--nb-shadow)] shrink-0">
							<Gamepad2 className="size-4 text-foreground" />
						</div>
						<DialogTitle className="font-display tracking-wide text-base">
							{t("notice.fullscreen_title")}
						</DialogTitle>
					</div>
				</DialogHeader>

				<DialogDescription asChild>
					<div className="space-y-3 text-sm leading-relaxed">
						<p>{t("notice.fullscreen_body")}</p>
						<p className="text-amber-700 dark:text-amber-400 font-medium">
							{t("notice.fullscreen_fix")}
						</p>
					</div>
				</DialogDescription>

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" size="sm" className={NB_BTN}>
							{t("notice.fullscreen_dismiss")}
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
