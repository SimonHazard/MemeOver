import { MotionConfig } from "framer-motion";
import { createRoot } from "react-dom/client";
import { DEFAULT_SETTINGS, type DisplayQueueItem } from "../../src/shared/types";
import { MediaDisplay } from "../../src/windows/overlay/components/media-display";
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
const root = document.getElementById("root");
if (root)
	createRoot(root).render(
		<MotionConfig reducedMotion="user">
			<div id="display" style={{ display: "flex", justifyContent: "center", padding: 40 }}>
				<MediaDisplay
					item={item}
					settings={{
						...DEFAULT_SETTINGS,
						bgEnabled: params.has("background"),
						bgPadding: 16,
						bgBorderWidth: 2,
						bgOpacity: 80,
						bgColor: "#336699",
						textPosition: "below",
					}}
					onVideoEnd={() => {}}
					startTimer={() => {}}
					onMediaError={() => {}}
				/>
			</div>
		</MotionConfig>,
	);
