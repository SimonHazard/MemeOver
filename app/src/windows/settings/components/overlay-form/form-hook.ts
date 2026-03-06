import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import type { OverlaySettingsValues } from "./schema";

const { fieldContext, formContext } = createFormHookContexts();

export const { useAppForm, withForm, useTypedAppFormContext } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {},
	formComponents: {},
});

/**
 * Consumes the typed overlay form from the nearest <form.AppForm> context.
 * Must be used inside an <form.AppForm> provider.
 */
export function useOverlayFormContext() {
	return useTypedAppFormContext({ defaultValues: {} as OverlaySettingsValues });
}
