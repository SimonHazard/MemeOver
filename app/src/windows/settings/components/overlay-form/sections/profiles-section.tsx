import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { Input } from "@memeover/ui/components/ui/input";
import { Label } from "@memeover/ui/components/ui/label";
import { Separator } from "@memeover/ui/components/ui/separator";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Import, Save, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AnimatedList } from "@/components/motion/animated-list";
import { HoldToConfirmButton } from "@/components/motion/hold-to-confirm-button";
import {
	createOverlayProfile,
	deleteOverlayProfile,
	importOverlayProfile,
	loadOverlayProfiles,
	pickOverlayProfileSettings,
	resolveOverlayProfileSettings,
	serializeOverlayProfile,
	updateOverlayProfile,
} from "@/shared/profiles";
import type { OverlayProfile, OverlayProfileSettings } from "@/shared/types";
import { SectionHeader } from "../components/section-header";
import { useOverlayFormContext } from "../form-hook";

const PROFILE_NAME_MAX = 48;

interface ProfilesSectionProps {
	onApplyProfile: (settings: OverlayProfileSettings) => Promise<void>;
}

function downloadProfile(profile: OverlayProfile) {
	const blob = new Blob([serializeOverlayProfile(profile)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	const safeName = profile.name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	link.href = url;
	link.download = `memeover-profile-${safeName || "overlay"}.json`;
	link.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function formatProfileDate(locale: string, value: number) {
	return new Intl.DateTimeFormat(locale, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(value));
}

interface ProfilesListProps {
	currentSettings: OverlayProfileSettings;
	onApplyProfile: (settings: OverlayProfileSettings) => Promise<void>;
}

function ProfilesList({ currentSettings, onApplyProfile }: ProfilesListProps) {
	const queryClient = useQueryClient();
	const { i18n, t } = useTranslation();
	const [profileName, setProfileName] = useState("");
	const importInputRef = useRef<HTMLInputElement>(null);

	const profilesQuery = useQuery({
		queryKey: ["overlayProfiles"],
		queryFn: loadOverlayProfiles,
	});

	const createMutation = useMutation({
		mutationFn: async () =>
			createOverlayProfile(profileName, pickOverlayProfileSettings(currentSettings)),
		onSuccess: (profile) => {
			setProfileName("");
			void queryClient.invalidateQueries({ queryKey: ["overlayProfiles"] });
			toast.success(t("toast.profileCreated", { name: profile.name }));
		},
		onError: () => toast.error(t("toast.profileCreateError")),
	});

	const updateMutation = useMutation({
		mutationFn: async (profile: OverlayProfile) =>
			updateOverlayProfile(profile.id, pickOverlayProfileSettings(currentSettings)),
		onSuccess: (profile) => {
			void queryClient.invalidateQueries({ queryKey: ["overlayProfiles"] });
			if (profile) toast.success(t("toast.profileUpdated", { name: profile.name }));
		},
		onError: () => toast.error(t("toast.profileUpdateError")),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteOverlayProfile,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["overlayProfiles"] });
			toast.success(t("toast.profileDeleted"));
		},
		onError: () => toast.error(t("toast.profileDeleteError")),
	});

	const importMutation = useMutation({
		mutationFn: importOverlayProfile,
		onSuccess: (profile) => {
			void queryClient.invalidateQueries({ queryKey: ["overlayProfiles"] });
			toast.success(t("toast.profileImported", { name: profile.name }));
		},
		onError: () => toast.error(t("toast.profileImportError")),
	});

	const applyMutation = useMutation({
		mutationFn: async (profile: OverlayProfile) => {
			await onApplyProfile(resolveOverlayProfileSettings(profile.settings, currentSettings));
			return profile;
		},
		onSuccess: (profile) => {
			toast.success(t("toast.profileApplied", { name: profile.name }));
		},
		onError: () => toast.error(t("toast.profileApplyError")),
	});

	const profiles = profilesQuery.data ?? [];
	const trimmedName = profileName.trim();
	const canCreate = trimmedName.length > 0 && !createMutation.isPending;
	const isBusy =
		createMutation.isPending ||
		updateMutation.isPending ||
		deleteMutation.isPending ||
		importMutation.isPending ||
		applyMutation.isPending;

	const updatedLabel = useMemo(() => t("display.profile_updated"), [t]);

	async function handleImport(file: File | undefined) {
		if (!file) return;
		try {
			const text = await file.text();
			// Event handlers use mutate so errors are handled by onError, without
			// creating an unhandled rejected promise. Reset even after a bad import
			// so choosing the same file again triggers another change event.
			importMutation.mutate(text, {
				onSettled: () => {
					if (importInputRef.current) importInputRef.current.value = "";
				},
			});
		} catch {
			toast.error(t("toast.profileImportError"));
			if (importInputRef.current) importInputRef.current.value = "";
		}
	}

	return (
		<div className="flex flex-col gap-5">
			<div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
				<div className="flex flex-col gap-2">
					<Label htmlFor="profile-name" className="font-display text-xs tracking-wide">
						{t("display.profile_name")}
					</Label>
					<Input
						id="profile-name"
						name="profileName"
						autoComplete="off"
						maxLength={PROFILE_NAME_MAX}
						placeholder={t("display.profile_name_placeholder")}
						value={profileName}
						onChange={(e) => setProfileName(e.target.value)}
					/>
				</div>
				<div className="flex items-end gap-2">
					<NbButton type="button" disabled={!canCreate} onClick={() => createMutation.mutate()}>
						<Save data-icon="inline-start" aria-hidden="true" />
						{t("display.profile_save")}
					</NbButton>
					<NbButton
						type="button"
						variant="outline"
						disabled={isBusy}
						onClick={() => importInputRef.current?.click()}
					>
						<Import data-icon="inline-start" aria-hidden="true" />
						{t("display.profile_import")}
					</NbButton>
					<input
						ref={importInputRef}
						type="file"
						name="profileImport"
						accept="application/json,.json"
						aria-label={t("display.profile_import")}
						className="hidden"
						onChange={(e) => void handleImport(e.target.files?.[0])}
					/>
				</div>
			</div>

			<Separator />

			<AnimatedList
				items={profiles}
				itemKey={(profile) => profile.id}
				loading={profilesQuery.isLoading}
				skeleton={
					<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
						{t("display.profile_loading")}
					</div>
				}
				empty={
					<div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
						{t("display.profile_empty")}
					</div>
				}
				renderItem={(profile) => (
					<div key={profile.id} className="grid gap-3 rounded-md border bg-background/60 p-3">
						<div className="min-w-0">
							<p className="truncate font-medium">{profile.name}</p>
							<p className="text-xs text-muted-foreground">
								{updatedLabel}{" "}
								<span className="font-mono tabular-nums" translate="no">
									{formatProfileDate(i18n.language, profile.updatedAt)}
								</span>
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<NbButton
								type="button"
								size="sm"
								disabled={isBusy}
								onClick={() => applyMutation.mutate(profile)}
							>
								<Check data-icon="inline-start" aria-hidden="true" />
								{t("display.profile_apply")}
							</NbButton>
							<NbButton
								type="button"
								size="sm"
								variant="outline"
								disabled={isBusy}
								onClick={() => updateMutation.mutate(profile)}
							>
								<Upload data-icon="inline-start" aria-hidden="true" />
								{t("display.profile_update")}
							</NbButton>
							<NbButton
								type="button"
								size="sm"
								variant="outline"
								disabled={isBusy}
								onClick={() => downloadProfile(profile)}
							>
								<Download data-icon="inline-start" aria-hidden="true" />
								{t("display.profile_export")}
							</NbButton>
							<HoldToConfirmButton
								disabled={isBusy}
								label={t("display.profile_delete_named", { name: profile.name })}
								onConfirm={() => deleteMutation.mutate(profile.id)}
							/>
						</div>
					</div>
				)}
			/>
		</div>
	);
}

export function ProfilesSection({ onApplyProfile }: ProfilesSectionProps) {
	const form = useOverlayFormContext();
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-5">
			<SectionHeader title={t("display.group_profiles")} hint={t("display.group_profiles_hint")} />
			<form.Subscribe selector={(s) => pickOverlayProfileSettings(s.values)}>
				{(values) => <ProfilesList currentSettings={values} onApplyProfile={onApplyProfile} />}
			</form.Subscribe>
		</div>
	);
}
