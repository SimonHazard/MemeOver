import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { emojiUrl, parseInlineEmojis } from "@/shared/helpers";

// Shadow values: 4 directional black outlines + a soft drop shadow for depth
const TEXT_SHADOW =
	"-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 8px rgba(0,0,0,0.9)";

const MIN_FONT_PX = 12;

// ─── InlineText ───────────────────────────────────────────────────────────────

/**
 * Renders a text string with inline Discord custom emojis as <img> elements.
 * `emojiHeight` controls the emoji size — defaults to "1.1em" (scales with
 * the surrounding font), or pass a px value for pixel-precise sizing.
 */
export function InlineText({
	text,
	emojiHeight = "1.1em",
}: {
	text: string;
	emojiHeight?: string;
}) {
	const segments = useMemo(() => parseInlineEmojis(text), [text]);
	return (
		<>
			{segments.map((seg) =>
				seg.kind === "text" ? (
					<span key={seg.offset}>{seg.value}</span>
				) : (
					<img
						key={seg.offset}
						src={emojiUrl(seg.id, seg.animated)}
						alt={seg.name}
						style={{ height: emojiHeight, display: "inline", verticalAlign: "middle" }}
					/>
				),
			)}
		</>
	);
}

// ─── TextDisplay ──────────────────────────────────────────────────────────────

interface TextDisplayProps {
	text: string;
	width: string;
	/** Desired font size in pixels. May be auto-reduced if the text doesn't fit. */
	textSize: number;
	textColor: string;
}

export function TextDisplay({ text, width, textSize, textColor }: TextDisplayProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLSpanElement>(null);
	const [fontSize, setFontSize] = useState<number>(textSize);

	useLayoutEffect(() => {
		const container = containerRef.current;
		const measure = measureRef.current;
		if (!container || !measure) return;

		function recalculate() {
			if (!container || !measure) return;
			// Subtract px-4 (1rem = 16px) on each side
			const containerWidth = container.clientWidth - 32;
			const naturalWidth = measure.scrollWidth;

			if (naturalWidth <= containerWidth || containerWidth <= 0) {
				setFontSize(textSize);
			} else {
				const scaled = Math.max(
					MIN_FONT_PX,
					Math.floor(textSize * (containerWidth / naturalWidth)),
				);
				setFontSize(scaled);
			}
		}

		recalculate();

		// Recalculate when the container is resized (e.g. mediaSize slider changes)
		const observer = new ResizeObserver(recalculate);
		observer.observe(container);
		return () => observer.disconnect();
	}, [textSize]);

	return (
		<div ref={containerRef} style={{ width }} className="relative overflow-hidden">
			{/* Hidden single-line span used to measure the text's natural width at base size */}
			<span
				ref={measureRef}
				aria-hidden
				className="absolute invisible pointer-events-none whitespace-nowrap font-bold"
				style={{ fontSize: textSize }}
			>
				<InlineText text={text} emojiHeight={`${textSize * 1.2}px`} />
			</span>
			<p
				style={{ textShadow: TEXT_SHADOW, fontSize, color: textColor }}
				className="font-bold text-center leading-snug px-4 line-clamp-4 overflow-hidden"
			>
				<InlineText text={text} emojiHeight={`${fontSize * 1.2}px`} />
			</p>
		</div>
	);
}
