import { Alert, AlertDescription, AlertTitle } from "@memeover/ui/components/ui/alert";
import { Button } from "@memeover/ui/components/ui/button";
import { NB_SHADOW_LG } from "@memeover/ui/lib/nb-classes";
import { AnimatePresence, motion } from "framer-motion";
import { Gamepad2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const STORAGE_KEY = "memeover_fullscreen_notice_dismissed";

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * Friendly, non-technical notice explaining that exclusive-fullscreen games
 * on Windows may block the overlay, with a simple fix (borderless mode).
 * Dismissed state is persisted in localStorage so it only shows once.
 */
export function FullscreenCompatibilityNotice() {
	const { t } = useTranslation();

	// Lazy initialiser — reads localStorage once on mount, no useEffect needed.
	const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === "true");

	function dismiss() {
		localStorage.setItem(STORAGE_KEY, "true");
		setDismissed(true);
	}

	return (
		<AnimatePresence>
			{!dismissed && (
				<motion.div
					initial={{ opacity: 0, y: -6 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -6 }}
					transition={{ duration: 0.18, ease: "easeOut" }}
				>
					<Alert
						className={`relative border-2 border-foreground bg-amber-50 dark:bg-amber-950/25 ${NB_SHADOW_LG} pr-10 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400`}
					>
						<Gamepad2 />

						<AlertTitle className="font-display tracking-wide">
							{t("notice.fullscreen_title")}
						</AlertTitle>

						<AlertDescription className="space-y-1.5">
							<p>{t("notice.fullscreen_body")}</p>
							<p className="text-amber-700 dark:text-amber-400 font-medium">
								{t("notice.fullscreen_fix")}
							</p>
						</AlertDescription>

						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							onClick={dismiss}
							aria-label={t("notice.fullscreen_dismiss")}
							className="absolute top-2 right-2 hover:bg-amber-100 dark:hover:bg-amber-900/40"
						>
							<X />
						</Button>
					</Alert>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
