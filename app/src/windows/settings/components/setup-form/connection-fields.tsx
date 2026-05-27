import { Input } from "@memeover/ui/components/ui/input";
import { Label } from "@memeover/ui/components/ui/label";
import { Switch } from "@memeover/ui/components/ui/switch";
import type {
	FormAsyncValidateOrFn,
	FormValidateOrFn,
	ReactFormExtendedApi,
} from "@tanstack/react-form";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { z } from "zod";
import { ConnectionCodeField } from "./connection-code";
import type { ParsedConnectionCode } from "./connection-code-parser";
import { SetupSchema, type SetupValues } from "./schema";

type SetupFormApi = ReactFormExtendedApi<
	SetupValues,
	FormValidateOrFn<SetupValues> | undefined,
	FormValidateOrFn<SetupValues> | undefined,
	FormAsyncValidateOrFn<SetupValues> | undefined,
	FormValidateOrFn<SetupValues> | undefined,
	FormAsyncValidateOrFn<SetupValues> | undefined,
	FormValidateOrFn<SetupValues> | undefined,
	FormAsyncValidateOrFn<SetupValues> | undefined,
	FormValidateOrFn<SetupValues> | undefined,
	FormAsyncValidateOrFn<SetupValues> | undefined,
	FormAsyncValidateOrFn<SetupValues> | undefined,
	unknown
>;

type FieldName = "wsUrl" | "guildId" | "token";

interface ConnectionFieldsProps {
	form: SetupFormApi;
	defaultWsUrl: string;
	inputClassName: string;
	showExpertToggle?: boolean;
	forceWsUrlVisible?: boolean;
	wsUrlPlaceholder?: string;
	renderFieldShell?: (children: ReactNode, fieldName: FieldName) => ReactNode;
}

function defaultFieldShell(children: ReactNode): ReactNode {
	return <div className="flex flex-col gap-2">{children}</div>;
}

function fieldError(errors: unknown[]): ReactNode {
	if (errors.length === 0) return null;
	return <p className="text-xs text-destructive font-text">{String(errors[0])}</p>;
}

export function validateSetupField(
	schema: z.ZodType,
	value: string,
	translate: (key: string) => string,
): string | undefined {
	const result = schema.safeParse(value);
	return result.success ? undefined : translate(result.error.issues[0]?.message ?? "");
}

export function applyConnectionCodeToForm(
	form: SetupFormApi,
	parsed: ParsedConnectionCode,
	defaultWsUrl: string,
): void {
	form.setFieldValue("guildId", parsed.guildId);
	form.setFieldValue("token", parsed.token);
	if (parsed.wsUrl) {
		form.setFieldValue("wsUrl", parsed.wsUrl);
		form.setFieldValue("expertMode", parsed.wsUrl !== defaultWsUrl);
	}
}

export function ConnectionCredentialsFields({
	form,
	defaultWsUrl,
	inputClassName,
	showExpertToggle = false,
	forceWsUrlVisible = false,
	wsUrlPlaceholder = defaultWsUrl,
	renderFieldShell = defaultFieldShell,
}: ConnectionFieldsProps) {
	const { t } = useTranslation();
	const validateField = (schema: z.ZodType, value: string): string | undefined =>
		validateSetupField(schema, value, t);

	return (
		<>
			<ConnectionCodeField
				onApply={(parsed) => applyConnectionCodeToForm(form, parsed, defaultWsUrl)}
			/>

			{showExpertToggle && (
				<form.Field name="expertMode">
					{(field) => (
						<div className="flex items-center justify-between gap-4">
							<div className="flex flex-col gap-0.5">
								<Label
									htmlFor={field.name}
									className="font-display tracking-wide text-xs cursor-pointer"
								>
									{t("connection.expertMode")}
								</Label>
								<p className="text-xs text-muted-foreground font-text">
									{t("connection.expertMode_hint")}
								</p>
							</div>
							<Switch
								id={field.name}
								checked={field.state.value}
								onCheckedChange={(checked) => {
									field.handleChange(checked);
									if (!checked) {
										form.setFieldValue("wsUrl", defaultWsUrl);
									}
								}}
								className="border-2 border-foreground shrink-0"
							/>
						</div>
					)}
				</form.Field>
			)}

			<form.Subscribe selector={(s) => s.values.expertMode}>
				{(expertMode) =>
					forceWsUrlVisible || expertMode ? (
						<form.Field
							name="wsUrl"
							validators={{
								onBlur: ({ value }) => validateField(SetupSchema.shape.wsUrl, value),
								onSubmit: ({ value }) => validateField(SetupSchema.shape.wsUrl, value),
							}}
						>
							{(field) =>
								renderFieldShell(
									<>
										<Label htmlFor={field.name} className="font-display tracking-wide text-xs">
											{t("connection.wsUrl")}
										</Label>
										<Input
											id={field.name}
											placeholder={wsUrlPlaceholder}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											className={inputClassName}
										/>
										{field.state.meta.isTouched && fieldError(field.state.meta.errors)}
									</>,
									"wsUrl",
								)
							}
						</form.Field>
					) : null
				}
			</form.Subscribe>

			<form.Field
				name="guildId"
				validators={{
					onBlur: ({ value }) => validateField(SetupSchema.shape.guildId, value),
					onSubmit: ({ value }) => validateField(SetupSchema.shape.guildId, value),
				}}
			>
				{(field) =>
					renderFieldShell(
						<>
							<Label htmlFor={field.name} className="font-display tracking-wide text-xs">
								{t("connection.guildId")}
							</Label>
							<Input
								id={field.name}
								placeholder="123456789012345678"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								className={inputClassName}
							/>
							<p className="text-xs text-muted-foreground">{t("connection.guildId_hint")}</p>
							{field.state.meta.isTouched && fieldError(field.state.meta.errors)}
						</>,
						"guildId",
					)
				}
			</form.Field>

			<form.Field
				name="token"
				validators={{
					onBlur: ({ value }) => validateField(SetupSchema.shape.token, value),
					onSubmit: ({ value }) => validateField(SetupSchema.shape.token, value),
				}}
			>
				{(field) =>
					renderFieldShell(
						<>
							<Label htmlFor={field.name} className="font-display tracking-wide text-xs">
								{t("connection.token")}
							</Label>
							<Input
								id={field.name}
								type="password"
								placeholder="••••••••••••••••"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								className={inputClassName}
							/>
							{field.state.meta.isTouched && fieldError(field.state.meta.errors)}
						</>,
						"token",
					)
				}
			</form.Field>
		</>
	);
}
