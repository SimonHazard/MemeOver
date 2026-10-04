import { NbButton } from "@memeover/ui/components/branded/nb-button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@memeover/ui/components/ui/alert-dialog";
import { NB_BTN_BASE, NB_BTN_DISABLED } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

// NbButton styling applied to the shadcn alert dialog buttons.
const NB_DIALOG_BUTTON = cn(NB_BTN_BASE, NB_BTN_DISABLED);

interface ConfirmActionButtonProps {
	/** Visible trigger text. */
	label: string;
	/** Accessible name when the visible label is ambiguous, e.g. one button per list row. */
	ariaLabel?: string;
	title: string;
	description: string;
	/** Text of the destructive confirmation button. */
	confirmLabel: string;
	onConfirm: () => void;
	disabled?: boolean;
	className?: string;
}

/** Destructive action guarded by a confirmation dialog. Cancel receives the initial focus. */
export function ConfirmActionButton({
	label,
	ariaLabel,
	title,
	description,
	confirmLabel,
	onConfirm,
	disabled = false,
	className,
}: ConfirmActionButtonProps) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const cancelRef = useRef<HTMLButtonElement>(null);

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger
				disabled={disabled}
				aria-label={ariaLabel}
				render={
					<NbButton
						type="button"
						size="sm"
						variant="outline"
						className={cn("text-destructive hover:text-destructive", className)}
					/>
				}
			>
				<Trash2 data-icon="inline-start" aria-hidden="true" />
				{label}
			</AlertDialogTrigger>
			<AlertDialogContent initialFocus={cancelRef}>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="gap-3">
					<AlertDialogCancel ref={cancelRef} className={NB_DIALOG_BUTTON}>
						{t("confirm.cancel")}
					</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						className={NB_DIALOG_BUTTON}
						onClick={() => {
							// The Base UI flavour of AlertDialogAction is a plain button: close explicitly.
							setOpen(false);
							onConfirm();
						}}
					>
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
