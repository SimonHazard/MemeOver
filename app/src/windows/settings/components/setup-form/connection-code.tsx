import { type ParsedConnectionCode, parseConnectionCode } from "@memeover/shared";
import { Button } from "@memeover/ui/components/ui/button";
import { Input } from "@memeover/ui/components/ui/input";
import { cn } from "@memeover/ui/lib/utils";
import { ClipboardPaste } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export { type ParsedConnectionCode, parseConnectionCode } from "@memeover/shared";

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
