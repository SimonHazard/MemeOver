import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Clipboard } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
export function CopyButton({
	value,
	label,
	onCopied,
	disabled = false,
}: {
	value: string;
	label: string;
	onCopied?: () => void;
	disabled?: boolean;
}) {
	const { t } = useTranslation(),
		reduced = useReducedMotion();
	const [copied, setCopied] = useState(false),
		timer = useRef<ReturnType<typeof setTimeout> | null>(null),
		mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			if (timer.current) clearTimeout(timer.current);
		};
	}, []);
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			if (!mounted.current) return;
			setCopied(true);
			onCopied?.();
			if (timer.current) clearTimeout(timer.current);
			timer.current = setTimeout(() => setCopied(false), 1500);
		} catch {
			toast.error(t("motion.copyError"));
		}
	};
	return (
		<NbButton variant="outline" size="sm" disabled={disabled || !value} onClick={() => void copy()}>
			<span className="relative h-4 w-4">
				<AnimatePresence mode="popLayout" initial={false}>
					<motion.span
						key={copied ? "copied" : "copy"}
						className="inline-block"
						initial={{
							opacity: 0,
							scale: reduced ? 1 : 0.8,
							filter: reduced ? "none" : "blur(2px)",
						}}
						animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
						exit={{ opacity: 0, scale: reduced ? 1 : 0.8, filter: reduced ? "none" : "blur(2px)" }}
						transition={{ type: "spring", duration: 0.18, bounce: 0 }}
					>
						{copied ? (
							<Check size={16} aria-hidden="true" />
						) : (
							<Clipboard size={16} aria-hidden="true" />
						)}
					</motion.span>
				</AnimatePresence>
			</span>
			{label}
			<span className="sr-only" aria-live="polite">
				{copied ? t("motion.copied") : ""}
			</span>
		</NbButton>
	);
}
