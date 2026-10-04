import { MotionConfig } from "framer-motion";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { useAppStore } from "../../src/shared/store";
import {
	DEFAULT_SETTINGS,
	type DisplayQueueItem,
	FLOATING_REACTION_ANIMATIONS,
} from "../../src/shared/types";
import { FloatingReactions } from "../../src/windows/overlay/components/floating-reactions";
import { MediaDisplay } from "../../src/windows/overlay/components/media-display";
import { MediaPopup } from "../../src/windows/overlay/components/media-popup";
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
			media_url: svg(
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

const root = document.getElementById("root");
if (root)
	createRoot(root).render(
		<StrictMode>
			<MotionConfig reducedMotion="user">
				{params.has("reactions") ? (
					<FloatingReactions />
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
