import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { type HoldState, nextHoldState } from "./hold-to-confirm-logic";
export function HoldToConfirmButton({
	onConfirm,
	label,
	holdMs = 1200,
	disabled = false,
	className = "",
}: {
	onConfirm: () => void;
	label: string;
	holdMs?: number;
	disabled?: boolean;
	className?: string;
}) {
	const { t } = useTranslation(),
		hintId = useId();
	const [holding, setHolding] = useState(false),
		state = useRef<HoldState>("idle"),
		started = useRef(0);
	const start = (repeat = false) => {
		if (disabled) return;
		const next = nextHoldState(state.current, { type: "start", repeat });
		if (next !== state.current) {
			state.current = next;
			started.current = performance.now();
			setHolding(true);
		}
	};
	const cancel = () => {
		state.current = nextHoldState(state.current, { type: "cancel" });
		setHolding(false);
	};
	return (
		<>
			<NbButton
				variant="outline"
				size="sm"
				className={`relative overflow-hidden touch-manipulation ${className}`}
				disabled={disabled}
				aria-label={t("motion.holdLabel", { label })}
				aria-describedby={hintId}
				data-holding={holding || undefined}
				onPointerDown={(e) => {
					if (e.button !== 0) return;
					e.currentTarget.setPointerCapture(e.pointerId);
					start();
				}}
				onPointerUp={cancel}
				onPointerCancel={cancel}
				onPointerLeave={cancel}
				onLostPointerCapture={cancel}
				onKeyDown={(e) => {
					if (e.key === " " || e.key === "Enter") {
						e.preventDefault();
						start(e.repeat);
					}
				}}
				onKeyUp={(e) => {
					if (e.key === " " || e.key === "Enter") {
						e.preventDefault();
						cancel();
					}
				}}
				onBlur={cancel}
				onClick={(e) => e.preventDefault()}
			>
				<span
					aria-hidden="true"
					className="absolute inset-0 bg-destructive/20 pointer-events-none"
					style={{
						clipPath: holding ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
						transition: `clip-path ${holding ? holdMs : 200}ms ${holding ? "linear" : "var(--ease-out)"}`,
					}}
					onTransitionEnd={(e) => {
						if (
							e.target !== e.currentTarget ||
							e.propertyName !== "clip-path" ||
							performance.now() - started.current < holdMs - 5
						)
							return;
						const next = nextHoldState(state.current, { type: "complete" });
						if (next === "confirmed" && state.current === "holding") {
							state.current = next;
							setHolding(false);
							onConfirm();
						}
					}}
				/>
				<span className="relative">{label}</span>
			</NbButton>
			<span id={hintId} className="sr-only">
				{t("motion.holdHint")}
			</span>
		</>
	);
}
