import { NbButton } from "@memeover/ui/components/branded/nb-button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@memeover/ui/components/ui/dialog";
import { NB_SHADOW_LG } from "@memeover/ui/lib/nb-classes";
import { useBlocker } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { settingsCloseRequests } from "../../settings-close";
import { useOverlayFormContext } from "./form-hook";

export function UnsavedChangesDialog({ isPending }: { isPending: boolean }) {
	const form = useOverlayFormContext();
	const { t } = useTranslation();
	const [closeRequested, setCloseRequested] = useState(false);
	useEffect(() => {
		function onClose(event: Event) {
			if (!form.state.isDefaultValue || form.state.isSubmitting || isPending) {
				event.preventDefault();
				setCloseRequested(true);
			}
		}
		settingsCloseRequests.addEventListener("close", onClose);
		return () => settingsCloseRequests.removeEventListener("close", onClose);
	}, [form, isPending]);
	const blocker = useBlocker({
		shouldBlockFn: ({ current, next }) =>
			current.pathname !== next.pathname &&
			(!form.state.isDefaultValue || form.state.isSubmitting || isPending),
		withResolver: true,
		enableBeforeUnload: () => !form.state.isDefaultValue,
	});

	function stay() {
		setCloseRequested(false);
		blocker.reset?.();
	}

	async function leave(discard = false) {
		if (discard) form.reset();
		if (closeRequested) {
			await getCurrentWindow().hide();
			setCloseRequested(false);
			blocker.reset?.();
		} else {
			blocker.proceed?.();
		}
	}

	async function saveAndLeave() {
		try {
			await form.handleSubmit();
			// Failed saves keep the dialog and the edited values in place.
			if (form.state.isSubmitSuccessful && form.state.isDefaultValue) await leave();
		} catch {
			// The mutation already reports persistence errors with a toast.
		}
	}

	return (
		<form.Subscribe selector={(s) => s.isSubmitting}>
			{(isSubmitting) => {
				const busy = isPending || isSubmitting;
				return (
					<Dialog
						open={closeRequested || blocker.status === "blocked"}
						onOpenChange={(open) => {
							if (!open && !busy) stay();
						}}
					>
						<DialogContent
							showCloseButton={false}
							className={`border-2 border-foreground ${NB_SHADOW_LG} motion-reduce:animate-none`}
						>
							<DialogHeader>
								<DialogTitle>{t("unsavedChanges.title")}</DialogTitle>
								<DialogDescription>{t("unsavedChanges.description")}</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<NbButton type="button" variant="outline" disabled={busy} onClick={stay}>
									{t("unsavedChanges.stay")}
								</NbButton>
								<NbButton
									type="button"
									variant="outline"
									disabled={busy}
									onClick={() => void leave(true)}
								>
									{t("unsavedChanges.discard")}
								</NbButton>
								<NbButton type="button" disabled={busy} onClick={() => void saveAndLeave()}>
									{busy ? t("display.saving") : t("unsavedChanges.saveAndLeave")}
								</NbButton>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				);
			}}
		</form.Subscribe>
	);
}
