import type { TextSize } from "@/shared/types";

// Shadow values: 4 directional black outlines + a soft drop shadow for depth
const TEXT_SHADOW =
	"-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 8px rgba(0,0,0,0.9)";

const TEXT_SIZE_CLASS: Record<TextSize, string> = {
	sm: "text-sm",
	base: "text-base",
	lg: "text-lg",
	xl: "text-xl",
	"2xl": "text-2xl",
};

interface TextDisplayProps {
	text: string;
	width: string;
	textSize: TextSize;
}

export function TextDisplay({ text, width, textSize }: TextDisplayProps) {
	return (
		<div style={{ width }} className="overflow-hidden">
			<p
				style={{ textShadow: TEXT_SHADOW }}
				className={`text-white ${TEXT_SIZE_CLASS[textSize]} font-bold text-center leading-snug px-4 line-clamp-4 text-ellipsis`}
			>
				{text}
			</p>
		</div>
	);
}
