// Shadow values: 4 directional black outlines + a soft drop shadow for depth
const TEXT_SHADOW =
	"-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 8px rgba(0,0,0,0.9)";

interface TextDisplayProps {
	text: string;
	width: string;
}

export function TextDisplay({ text, width }: TextDisplayProps) {
	return (
		<div style={{ width }} className="overflow-hidden">
			<p
				style={{ textShadow: TEXT_SHADOW }}
				className="text-white text-xl font-bold text-center leading-snug px-4 line-clamp-4 text-ellipsis"
			>
				{text}
			</p>
		</div>
	);
}
