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

	// Persisted values are the comparison baseline for save and navigation guards.
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
			const draft = form.state.values;
			setBaseValues(value);
			form.reset(value);
			// Preserve edits made while persistence was in flight.
			for (const key of OVERLAY_PROFILE_FIELDS) {
				if (!Object.is(draft[key], value[key])) form.setFieldValue(key, draft[key]);
			}
		},
	});

	function applyValues(values: OverlayProfileSettings) {
		const next = values as OverlaySettingsValues;
		setBaseValues(next);
		form.reset(next);
	}

	async function saveAndApplyValues(values: OverlayProfileSettings) {
		const next = values as OverlaySettingsValues;
		await apply(next);
		applyValues(next);
	}

	return { form, isPending: isSavePending || isApplyPending, saveAndApplyValues };
}
