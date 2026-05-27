import { Button } from "@memeover/ui/components/ui/button";
import { Input } from "@memeover/ui/components/ui/input";
import { cn } from "@memeover/ui/lib/utils";
import { ClipboardPaste } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export interface ParsedConnectionCode {
	guildId: string;
	token: string;
	wsUrl?: string;
}

const GUILD_ID_RE = /\b\d{17,20}\b/;
const TOKEN_RE = /(?:token|jeton)\s*[:=]\s*([A-Za-z0-9._~-]{16,})/i;

function stripCodeFence(raw: string): string {
	return raw
		.trim()
		.replace(/^```[a-z]*\s*/i, "")
		.replace(/\s*```$/i, "")
		.trim();
}

function parseSetupUrl(raw: string): ParsedConnectionCode | null {
	try {
		const url = new URL(raw);
		if (url.protocol !== "memeover:") return null;
		const action = url.hostname || url.pathname.replace(/^\/+/, "");
		if (action !== "setup") return null;

		const guildId = url.searchParams.get("guild_id") ?? url.searchParams.get("guildId");
		const token = url.searchParams.get("token");
		const wsUrl = url.searchParams.get("ws_url") ?? url.searchParams.get("wsUrl") ?? undefined;
		if (!guildId || !token || !GUILD_ID_RE.test(guildId)) return null;

		return { guildId, token, wsUrl };
	} catch {
		return null;
	}
}

function parseJson(raw: string): ParsedConnectionCode | null {
	try {
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const guildId = parsed.guild_id ?? parsed.guildId ?? parsed.server_id ?? parsed.serverId;
		const token = parsed.token;
		const wsUrl = parsed.ws_url ?? parsed.wsUrl;

		if (typeof guildId !== "string" || typeof token !== "string") return null;
		if (!GUILD_ID_RE.test(guildId)) return null;

		return {
			guildId,
			token,
			wsUrl: typeof wsUrl === "string" ? wsUrl : undefined,
		};
	} catch {
		return null;
	}
}

export function parseConnectionCode(raw: string): ParsedConnectionCode | null {
	const value = stripCodeFence(raw);
	if (!value) return null;

	const parsedUrl = parseSetupUrl(value);
	if (parsedUrl) return parsedUrl;

	const parsedJson = parseJson(value);
	if (parsedJson) return parsedJson;

	const guildId = value.match(GUILD_ID_RE)?.[0];
	const namedToken = value.match(TOKEN_RE)?.[1];
	const fallbackToken = value
		.split(/\s+/)
		.find((part) => part !== guildId && /^[A-Za-z0-9._~-]{16,}$/.test(part));
	const token = namedToken ?? fallbackToken;

	if (!guildId || !token) return null;
	return { guildId, token };
}

interface ConnectionCodeFieldProps {
	className?: string;
	onApply: (parsed: ParsedConnectionCode) => void;
}

export function ConnectionCodeField({ className, onApply }: ConnectionCodeFieldProps) {
	const { t } = useTranslation();
	const [value, setValue] = useState("");

	function applyValue() {
		const parsed = parseConnectionCode(value);
		if (!parsed) {
			toast.error(t("toast.connectionImportError"));
			return;
		}

		onApply(parsed);
		setValue("");
		toast.success(t("toast.connectionImported"));
	}

	return (
		<div className={cn("rounded-md border-2 border-dashed border-foreground/30 p-3", className)}>
			<label className="font-display text-xs tracking-wide" htmlFor="connection-code">
				{t("connection.quickPaste")}
			</label>
			<div className="mt-2 flex gap-2">
				<Input
					id="connection-code"
					value={value}
					onChange={(event) => setValue(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							applyValue();
						}
					}}
					placeholder={t("connection.quickPaste_placeholder")}
					className="border-2 border-input focus:border-foreground"
				/>
				<Button
					type="button"
					onClick={applyValue}
					disabled={!value.trim()}
					className="shrink-0 border-2"
					aria-label={t("connection.quickPaste_apply")}
				>
					<ClipboardPaste className="h-4 w-4" aria-hidden="true" />
					<span className="hidden sm:inline">{t("connection.quickPaste_apply")}</span>
				</Button>
			</div>
			<p className="mt-2 text-xs text-muted-foreground">{t("connection.quickPaste_hint")}</p>
		</div>
	);
}
