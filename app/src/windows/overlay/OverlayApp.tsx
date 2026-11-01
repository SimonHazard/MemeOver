import { lazy, Suspense } from "react";
import { useTauriEvent } from "@/hooks/useTauriEvent";
import { useLanguageSync } from "@/i18n/use-language-sync";
import { useAppStore } from "@/shared/store";
import { ConnectionNotifications } from "./components/connection-notifications";
import { FloatingReactions } from "./components/floating-reactions";
import { MediaPopup } from "./components/media-popup";
import { useHistoryLogger } from "./hooks/useHistoryLogger";
import { useMediaDisplay } from "./hooks/useMediaDisplay";
import { useOverlayWs } from "./hooks/useOverlayWs";

// ─── Component ────────────────────────────────────────────────────────────────

const OverlayTestRuntime = import.meta.env.DEV
	? lazy(() => import("@/dev/overlay-test-runtime"))
	: null;

function LiveOverlayMedia() {
	useOverlayWs();
	const display = useMediaDisplay();
	const settings = useAppStore((s) => s.settings);
	useHistoryLogger(display.current);
	return <MediaPopup {...display} settings={settings} />;
}

export function OverlayApp() {
	useLanguageSync();

	// Dev-only: simulated production background
	const devPreview = useTauriEvent<boolean>("overlay-dev-preview") ?? false;

	return (
		<div className="fixed inset-0 w-screen h-screen overflow-hidden pointer-events-none bg-transparent">
			{OverlayTestRuntime ? (
				<Suspense fallback={null}>
					<OverlayTestRuntime>
						<LiveOverlayMedia />
					</OverlayTestRuntime>
				</Suspense>
			) : (
				<LiveOverlayMedia />
			)}

			<FloatingReactions />
			<ConnectionNotifications />

			{/* ── DEV badge (always visible in dev, not only in preview) ── */}
			{import.meta.env.DEV && (
				<div
					className="absolute top-3 right-3 pointer-events-none select-none"
					style={{
						fontFamily: "monospace",
						fontSize: "10px",
						fontWeight: 700,
						letterSpacing: "0.1em",
						color: devPreview ? "#4ade80" : "#facc15",
						background: devPreview ? "rgba(0,40,10,0.50)" : "rgba(40,30,0,0.50)",
						border: `1px solid ${devPreview ? "#4ade80" : "#facc15"}`,
						borderRadius: "4px",
						padding: "2px 6px",
					}}
				>
					{devPreview ? "DEV · PROD PREVIEW" : "DEV"}
				</div>
			)}
		</div>
	);
}
