import type { DisplayQueueItem, Settings } from "@/shared/types";
import { AudioEqualizer } from "./audio-equalizer";
import { AuthorBadge } from "./author-badge";
import { TextDisplay } from "./text-bubble";

const CAPTION_SHADOW = "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000";

// ─── Props ────────────────────────────────────────────────────────────────────

interface MediaDisplayProps {
	item: DisplayQueueItem;
	settings: Settings;
	onVideoEnd: () => void;
	startTimer: () => void;
	onMediaError: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MediaDisplay({
	item,
	settings,
	onVideoEnd,
	startTimer,
	onMediaError,
}: MediaDisplayProps) {
	const width = `${settings.mediaSize}vw`;

	// TEXT branch — startTimer is handled by useMediaDisplay (delay=0 safety fallback)
	if (item.type === "TEXT") {
		return (
			<div className="flex flex-col items-center gap-2">
				<AuthorBadge
					username={item.author_username}
					displayName={item.author_display_name}
					avatarUrl={item.author_avatar_url}
				/>
				<TextDisplay text={item.text} width={width} textSize={settings.textSize} />
			</div>
		);
	}

	// MEDIA branch — item is narrowed to MediaQueueItem here
	return (
		<div className="flex flex-col items-center gap-2">
			{/* ── Author badge ── */}
			<AuthorBadge
				username={item.author_username}
				displayName={item.author_display_name}
				avatarUrl={item.author_avatar_url}
			/>
			{/* ── Video ── */}
			{item.media_type === "video" && (
				<video
					src={item.media_url}
					autoPlay
					loop={false}
					muted={settings.volume === 0}
					onLoadedMetadata={(e) => {
						(e.currentTarget as HTMLVideoElement).volume = settings.volume / 100;
					}}
					onPlay={startTimer}
					onEnded={onVideoEnd}
					onError={onMediaError}
					style={{ width, maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain" }}
					className="rounded-xl shadow-2xl block"
				/>
			)}

			{/* ── Image / GIF ── */}
			{(item.media_type === "image" || item.media_type === "gif") && (
				<img
					src={item.media_url}
					alt=""
					onLoad={startTimer}
					onError={onMediaError}
					style={{ width, maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain" }}
					className="rounded-xl shadow-2xl block"
					draggable={false}
				/>
			)}

			{/* ── Audio ── */}
			{item.media_type === "audio" && (
				<div
					style={{ width, maxWidth: "90vw" }}
					className="rounded-xl bg-black/70 backdrop-blur-lg p-6 flex flex-col items-center gap-3 shadow-2xl"
				>
					<AudioEqualizer />
					{/* biome-ignore lint/a11y/useMediaCaption: overlay média */}
					<audio
						src={item.media_url}
						autoPlay
						className="hidden"
						onPlay={startTimer}
						onEnded={onVideoEnd}
						onError={onMediaError}
					/>
					{item.text && (
						<p
							style={{ textShadow: CAPTION_SHADOW }}
							className="text-white text-sm font-semibold text-center leading-snug line-clamp-2 overflow-hidden w-full"
						>
							{item.text}
						</p>
					)}
				</div>
			)}

			{/* ── Caption (image / gif / video) ── */}
			{item.media_type !== "audio" && item.text && (
				<p
					style={{ maxWidth: width, textShadow: CAPTION_SHADOW }}
					className="text-white text-sm font-semibold text-center leading-snug line-clamp-2 overflow-hidden px-2"
				>
					{item.text}
				</p>
			)}
		</div>
	);
}
