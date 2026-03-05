export function AudioEqualizer() {
	const delays = ["0ms", "150ms", "75ms", "225ms", "30ms"];
	return (
		<div className="flex items-end justify-center gap-1 h-12">
			{delays.map((delay, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: Intended behavior
					key={`equalizer-bar-${i}`}
					className="inline-block w-2 rounded-sm bg-white animate-bounce"
					style={{ height: "100%", animationDelay: delay, animationDuration: "600ms" }}
				/>
			))}
		</div>
	);
}
