import { lazy, type ReactNode, Suspense, useEffect } from "react";
import { useTauriEvent, useTauriEventVersion } from "@/hooks/useTauriEvent";
import { useLanguageSync } from "@/i18n/use-language-sync";
import { useAppStore } from "@/shared/store";
import { showConnectionNotification } from "./components/connection-notifications";
import { logDisplayedItem } from "./hooks/history-logger";
import { OverlayStage } from "./OverlayStage";

// ─── Component ────────────────────────────────────────────────────────────────

const OverlayTestRuntime = import.meta.env.DEV
	? lazy(() => import("@/dev/overlay-test-runtime"))
	: null;

const DevMediaWrapper = OverlayTestRuntime
	? function DevMediaWrapper({ children }: { children: ReactNode }) {
			return (
				<Suspense fallback={null}>
					<OverlayTestRuntime>{children}</OverlayTestRuntime>
				</Suspense>
			);
		}
	: undefined;

export function OverlayApp() {
	useLanguageSync();
	const muted = useAppStore((s) => s.settings.desktopOverlayMuted);

	// The settings window is often hidden: this is where a streamer can see the source is down.
	const sourceStartFailures = useTauriEventVersion("browser-source-start-failed");
	useEffect(() => {
		if (sourceStartFailures > 0) {
			showConnectionNotification(1, "overlay.browserSourceStartFailed");
		}
	}, [sourceStartFailures]);

	// Dev-only: simulated production background
	const devPreview = useTauriEvent<boolean>("overlay-dev-preview") ?? false;

	return (
		<div className="fixed inset-0 w-screen h-screen overflow-hidden pointer-events-none bg-transparent">
			<OverlayStage
				muted={muted}
				onCurrentChange={logDisplayedItem}
				MediaWrapper={DevMediaWrapper}
			/>

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
