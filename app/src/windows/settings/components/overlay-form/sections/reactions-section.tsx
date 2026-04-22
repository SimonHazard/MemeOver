import { Label } from "@memeover/ui/components/ui/label";
import { Switch } from "@memeover/ui/components/ui/switch";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "../components/section-header";
import { useOverlayFormContext } from "../form-hook";

export function ReactionsSection() {
	const form = useOverlayFormContext();
	const { t } = useTranslation();

	return (
		<div className="space-y-5">
			<SectionHeader
				title={t("display.group_reactions")}
				hint={t("display.group_reactions_hint")}
			/>

			<form.Field name="floatingReactionsEnabled">
				{(field) => (
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-0.5">
							<Label className="font-display tracking-wide text-xs">
								{t("display.reactions_enabled")}
							</Label>
							<p className="text-xs text-muted-foreground">
								{t("display.reactions_enabled_hint")}
							</p>
						</div>
						<Switch
							checked={field.state.value}
							onCheckedChange={field.handleChange}
							className="shrink-0 mt-0.5"
						/>
					</div>
				)}
			</form.Field>
		</div>
	);
}
