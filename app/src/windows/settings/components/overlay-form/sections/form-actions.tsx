import { Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
						className="w-full gap-2 border-2 border-foreground shadow-[3px_3px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.75 active:translate-y-0.75 transition-all font-display tracking-wide disabled:opacity-40 disabled:shadow-none"
					>
						<Save className="h-4 w-4" />
						{isSubmitting || isPending ? t("display.saving") : t("display.save")}
					</Button>
				)}
			</form.Subscribe>
		</>
	);
}
