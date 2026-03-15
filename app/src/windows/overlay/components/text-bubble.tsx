import { useLayoutEffect, useRef, useState } from "react";
import { emojiUrl, parseInlineEmojis } from "@/shared/helpers";
import type { TextSize } from "@/shared/types";

// Shadow values: 4 directional black outlines + a soft drop shadow for depth
const TEXT_SHADOW =
	"-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 8px rgba(0,0,0,0.9)";

/** Base font sizes in pixels, one per TextSize step */
const TEXT_SIZE_PX: Record<TextSize, number> = {
	xs: 11,
	sm: 13,
	base: 16,
	lg: 18,
	xl: 20,
	"2xl": 24,
	"3xl": 30,
	"4xl": 36,
};

const MIN_FONT_PX = 12;

interface TextDisplayProps {
	text: string;
	width: string;
	textSize: TextSize;
	textColor: string;
}

export function TextDisplay({ text, width, textSize, textColor }: TextDisplayProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLSpanElement>(null);
	const [fontSize, setFontSize] = useState<number>(TEXT_SIZE_PX[textSize]);

	useLayoutEffect(() => {
		const container = containerRef.current;
		const measure = measureRef.current;
		if (!container || !measure) return;

		function recalculate() {
			if (!container || !measure) return;
			const basePx = TEXT_SIZE_PX[textSize];
			// Subtract px-4 (1rem = 16px) on each side
			const containerWidth = container.clientWidth - 32;
			const naturalWidth = measure.scrollWidth;

			if (naturalWidth <= containerWidth || containerWidth <= 0) {
				setFontSize(basePx);
			} else {
				const scaled = Math.max(MIN_FONT_PX, Math.floor(basePx * (containerWidth / naturalWidth)));
				setFontSize(scaled);
			}
		}

		recalculate();

		// Recalculate when the container is resized (e.g. mediaSize slider changes)
		const observer = new ResizeObserver(recalculate);
		observer.observe(container);
		return () => observer.disconnect();
	}, [textSize]);

	const segments = parseInlineEmojis(text);

	const renderSegments = (size: number) =>
		segments.map((seg) =>
			seg.kind === "text" ? (
				<span key={seg.offset}>{seg.value}</span>
			) : (
				<img
					key={seg.offset}
					src={emojiUrl(seg.id, seg.animated)}
					alt={seg.name}
					style={{ height: `${size * 1.2}px`, display: "inline", verticalAlign: "middle" }}
				/>
			),
		);

	return (
		<div ref={containerRef} style={{ width }} className="relative overflow-hidden">
			{/* Hidden single-line span used to measure the text's natural width at base size */}
			<span
				ref={measureRef}
				aria-hidden
				className="absolute invisible pointer-events-none whitespace-nowrap font-bold"
				style={{ fontSize: TEXT_SIZE_PX[textSize] }}
			>
				{renderSegments(TEXT_SIZE_PX[textSize])}
			</span>
			<p
				style={{ textShadow: TEXT_SHADOW, fontSize, color: textColor }}
				className="font-bold text-center leading-snug px-4 line-clamp-4 overflow-hidden"
			>
				{renderSegments(fontSize)}
			</p>
		</div>
	);
}
