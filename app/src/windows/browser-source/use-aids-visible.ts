import { useEffect, useState } from "react";

/** Long enough to read and click, short enough not to stay on air. */
export const AIDS_VISIBLE_MS = 15_000;

/**
 * Preview aids show briefly after loading and whenever the pointer moves. A streaming software
 * that refuses autoplay also lands in preview mode, and with no pointer there nothing stays on
 * stream. A click or key press anywhere still enables the sound while they are hidden.
 */
export function useAidsVisible(): boolean {
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const show = () => {
			setVisible(true);
			clearTimeout(timer);
			timer = setTimeout(() => setVisible(false), AIDS_VISIBLE_MS);
		};
		show();
		window.addEventListener("pointermove", show);
		return () => {
			clearTimeout(timer);
			window.removeEventListener("pointermove", show);
		};
	}, []);

	return visible;
}
