import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { Link2Off } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Shown only where sound needs a gesture; a streaming source renders nothing on stream. */
export function IncompleteLink() {
	const { t } = useTranslation();
	return (
		<div className="fixed inset-0 flex items-center justify-center p-4">
			<NbCard className="max-w-sm bg-background">
				<div className="flex items-start gap-3">
					<Link2Off className="size-5 shrink-0" aria-hidden="true" />
					<div>
						<h1 className="font-display text-base tracking-wide">
							{t("browserSource.incomplete.title")}
						</h1>
						<p className="mt-1 text-sm font-text text-muted-foreground">
							{t("browserSource.incomplete.desc")}
						</p>
					</div>
				</div>
			</NbCard>
		</div>
	);
}
