import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { loadSettings, persistSettings } from "@/shared/settings";
import { OVERLAY_PROFILE_FIELDS, type OverlayProfileSettings, type Settings } from "@/shared/types";
import { useAppForm } from "./form-hook";
import { extractDefaults, type OverlaySettingsValues } from "./schema";

export function useOverlayForm(initialData: Settings) {
	const queryClient = useQueryClient();
	const { t } = useTranslation();

	// useState stabilise la référence des defaultValues : elle ne change que lors d'une
	// sauvegarde explicite via setBaseValues(value). handleSubmit() marque isTouched=true
	// sur tous les champs, donc form.update() ne déclenchera jamais de reset() même si
	// les defaultValues changent après la sauvegarde — pas de rollback visuel.
	const [baseValues, setBaseValues] = useState<OverlaySettingsValues>(() =>
		extractDefaults(initialData),
	);

	async function persistOverlayValues(values: OverlaySettingsValues) {
		const current = await queryClient.fetchQuery({
			queryKey: ["settings"],
			queryFn: loadSettings,
		});
		await persistSettings({ ...current, ...values });
	}

	const { mutateAsync: save, isPending: isSavePending } = useMutation({
		mutationFn: async (values: OverlaySettingsValues) => {
			await persistOverlayValues(values);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
			toast.success(t("toast.displaySaved"));
		},
		onError: () => {
			toast.error(t("toast.settingsError"));
		},
	});

	const { mutateAsync: apply, isPending: isApplyPending } = useMutation({
		mutationFn: async (values: OverlaySettingsValues) => {
			await persistOverlayValues(values);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
		onError: () => {
			toast.error(t("toast.settingsError"));
		},
	});

	const form = useAppForm({
		defaultValues: baseValues,
		onSubmit: async ({ value }) => {
			await save(value);
			// Met à jour les defaultValues de TanStack Form : form.state.isDefaultValue
			// repassera à true, désactivant le bouton Save — sans appel à reset().
			setBaseValues(value);
		},
	});

	function applyValues(values: OverlayProfileSettings) {
		const next = values as OverlaySettingsValues;
		for (const key of OVERLAY_PROFILE_FIELDS) {
			form.setFieldValue(key, next[key]);
		}
		setBaseValues(next);
	}

	async function saveAndApplyValues(values: OverlayProfileSettings) {
		const next = values as OverlaySettingsValues;
		await apply(next);
		applyValues(next);
	}

	return { form, isPending: isSavePending || isApplyPending, saveAndApplyValues };
}
