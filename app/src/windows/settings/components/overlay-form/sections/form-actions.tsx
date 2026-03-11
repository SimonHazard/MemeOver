import { Button } from "@memeover/ui/components/ui/button";
import { Separator } from "@memeover/ui/components/ui/separator";
import { NB_BTN_DISABLED, NB_BTN_LG } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOverlayFormContext } from "../form-hook";

interface FormActionsProps {
	isPending: boolean;
}

export function FormActions({ isPending }: FormActionsProps) {
	const form = useOverlayFormContext();
	const { t } = useTranslation();

	return (
		<>
			<Separator />
			<form.Subscribe selector={(s) => [s.isDefaultValue, s.isSubmitting] as const}>
				{([isDefaultValue, isSubmitting]) => (
					<Button
						type="submit"
						disabled={isDefaultValue || isSubmitting || isPending}
						className={cn(NB_BTN_LG, NB_BTN_DISABLED, "w-full gap-2")}
					>
						<Save className="h-4 w-4" />
						{isSubmitting || isPending ? t("display.saving") : t("display.save")}
					</Button>
				)}
			</form.Subscribe>
		</>
	);
}
