import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { MotionConfig } from "framer-motion";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import i18n from "../../src/i18n";
import { useLanguageSync } from "../../src/i18n/use-language-sync";
import { useAppStore } from "../../src/shared/store";
import {
	DEFAULT_SETTINGS,
	type DisplayQueueItem,
	FLOATING_REACTION_ANIMATIONS,
	type OverlayPosition,
} from "../../src/shared/types";
import { AUTHOR_BADGE_HEIGHT } from "../../src/windows/overlay/components/author-badge";
import { ConnectionNotifications } from "../../src/windows/overlay/components/connection-notifications";
import { FloatingReactions } from "../../src/windows/overlay/components/floating-reactions";
import { MediaDisplay } from "../../src/windows/overlay/components/media-display";
import { MediaPopup } from "../../src/windows/overlay/components/media-popup";
import { useOverlayWs } from "../../src/windows/overlay/hooks/useOverlayWs";
import "../../src/App.css";

const params = new URLSearchParams(location.search);
const svg = (content: string) => `data:image/svg+xml,${encodeURIComponent(content)}`;
const author = {
	channel_id: "badge-test",
	message_id: "badge-test",
	queueId: "badge-test",
	guild_id: "123456789012345678",
	author_id: "test-author",
	author_username: params.has("long") ? "A very long author name ".repeat(20) : "iXeDay SimoHz",
	author_avatar_url: svg(
		'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#EB459F"/></svg>',
	),
	timestamp: Date.now(),
};
const item: DisplayQueueItem = params.has("text")
	? { ...author, type: "TEXT", text: "Example message" }
	: {
			...author,
			type: "MEDIA",
			media_type: "image",
			media_url: params.has("portrait")
				? svg(
						'<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><rect width="720" height="1280" fill="#777"/></svg>',
					)
				: svg(
						'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#777"/></svg>',
					),
			anonymous: params.has("anonymous"),
			text: "Example caption",
		};
const settings = {
	...DEFAULT_SETTINGS,
	bgEnabled: params.has("background"),
	bgPadding: 16,
	bgBorderWidth: 2,
	bgOpacity: 80,
	bgColor: "#336699",
	textPosition: "below" as const,
};
// `?position=` renders the real full-screen popup with the largest media size.
const position = params.get("position") as OverlayPosition | null;

function PopupHarness() {
	const [visible, setVisible] = useState(true);
	const [sequence, setSequence] = useState(0);
	const [exits, setExits] = useState(0);
	return (
		<>
			<button type="button" onClick={() => setVisible(false)}>
				Hide media
			</button>
			<button
				type="button"
				onClick={() => {
					setSequence((n) => n + 1);
					setVisible(true);
				}}
			>
				Show next media
			</button>
			<output id="exits">{exits}</output>
			<div className="pointer-events-none">
				<MediaPopup
					current={{ ...item, queueId: `badge-${sequence}` }}
					isVisible={visible}
					settings={settings}
					onExitComplete={() => setExits((n) => n + 1)}
					onVideoEnd={() => {}}
					startTimer={() => {}}
					onMediaError={() => {}}
				/>
			</div>
		</>
	);
}

if (params.has("reactions")) {
	useAppStore.setState({
		reactions: FLOATING_REACTION_ANIMATIONS.map((animation, index) => ({
			id: animation,
			emoji: "🎉",
			leftPct: 10 + index * 15,
			durationMs: 1500,
			animation,
			opacityPct: 80,
			sizeVmin: 6,
			fadeInPct: 40,
			fadeOutPct: 55,
			amplitudeVw: 8,
			direction: 1,
			rotationDeg: 24,
		})),
	});
}

function NotificationsHarness() {
	useLanguageSync();
	useOverlayWs();
	const count = useAppStore((s) => s.memberCount);
	const status = useAppStore((s) => s.wsStatus);
	const enabled = useAppStore((s) => s.settings.connectionNotificationsEnabled);
	return (
		<>
			<output id="connection-state">
				{status}:{count}
			</output>
			<button
				type="button"
				onClick={() =>
					useAppStore.getState().updateSettings({ connectionNotificationsEnabled: !enabled })
				}
			>
				Toggle notifications
			</button>
			<button type="button" onClick={() => useAppStore.getState().setOverlayHealth("closed")}>
				Hide overlay
			</button>
			<button type="button" onClick={() => useAppStore.getState().setOverlayHealth("alive")}>
				Show overlay
			</button>
			<ConnectionNotifications />
		</>
	);
}

function NotificationsLifecycleHarness() {
	const [mounted, setMounted] = useState(true);
	return (
		<>
			<button type="button" onClick={() => setMounted((value) => !value)}>
				{mounted ? "Unmount notifications" : "Remount notifications"}
			</button>
			{mounted && <NotificationsHarness />}
		</>
	);
}

if (params.has("notifications")) {
	document.documentElement.dataset.window = "overlay";
	mockWindows("overlay");
	mockIPC(() => null, { shouldMockEvents: true });
	const language = params.get("lang") ?? localStorage.getItem("lang") ?? "en";
	localStorage.setItem("lang", language);
	void i18n.changeLanguage(language);
	useAppStore.setState({
		overlayHealth: "alive",
		settings: {
			...DEFAULT_SETTINGS,
			guildId: "123456789012345678",
			token: "test-token",
			clientId: "notification-test-client",
			wsUrl: "ws://notifications.test/ws",
			connectionNotificationPosition: (params.get("corner") ??
				"bottom-right") as typeof DEFAULT_SETTINGS.connectionNotificationPosition,
			connectionNotificationDuration: Number(
				params.get("duration") ?? DEFAULT_SETTINGS.connectionNotificationDuration,
			),
		},
	});
}

const root = document.getElementById("root");
if (root)
	createRoot(root).render(
		<StrictMode>
			<MotionConfig reducedMotion="user">
				{params.has("notifications") ? (
					<NotificationsLifecycleHarness />
				) : params.has("reactions") ? (
					<FloatingReactions />
				) : position ? (
					<div id="display">
						{/* Measures the height the layout reserves for the badge. */}
						<div id="badge-height-probe" style={{ height: AUTHOR_BADGE_HEIGHT }} />
						<MediaPopup
							current={item}
							isVisible
							settings={{ ...settings, position, mediaSize: 90 }}
							onExitComplete={() => {}}
							onVideoEnd={() => {}}
							startTimer={() => {}}
							onMediaError={() => {}}
						/>
					</div>
				) : params.has("popup") ? (
					<PopupHarness />
				) : (
					<div id="display" style={{ display: "flex", justifyContent: "center", padding: 40 }}>
						<MediaDisplay
							item={item}
							settings={settings}
							onVideoEnd={() => {}}
							startTimer={() => {}}
							onMediaError={() => {}}
						/>
					</div>
				)}
			</MotionConfig>
		</StrictMode>,
	);
