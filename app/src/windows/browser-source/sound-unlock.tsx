import { NB_BTN_BASE } from "@memeover/ui/lib/nb-classes";
import { Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Regular browsers block autoplay with sound until a gesture. */
export function SoundUnlock({ onUnlock }: { onUnlock: () => void }) {
	const { t } = useTranslation();
	return (
		<button
			type="button"
			onClick={onUnlock}
			className={`${NB_BTN_BASE} pointer-events-auto fixed bottom-4 right-4 bg-background px-3 py-1.5 text-xs`}
		>
			<Volume2 className="size-4" aria-hidden="true" />
			{t("browserSource.enableSound")}
		</button>
	);
}
