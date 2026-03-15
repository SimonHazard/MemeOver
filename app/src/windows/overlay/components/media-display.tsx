import type React from "react";
import type { DisplayQueueItem, Settings } from "@/shared/types";
import { AudioEqualizer } from "./audio-equalizer";
import { AuthorBadge } from "./author-badge";
import { InlineText, TextDisplay } from "./text-bubble";

const CAPTION_SHADOW = "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000";
// Discord stickers are fixed-size transparent assets — not scaled by mediaSize
const STICKER_MAX_SIZE = "256px";

function hexToRgba(hex: string, opacity: number): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

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
	const {
		bgEnabled,
		bgColor,
		bgOpacity,
		bgBorderColor,
		bgBorderOpacity,
		bgBorderWidth,
		bgBorderRadius,
		bgPadding,
	} = settings;

	const bgWrapperStyle: React.CSSProperties = bgEnabled
		? {
				backgroundColor: hexToRgba(bgColor, bgOpacity),
				borderColor: hexToRgba(bgBorderColor, bgBorderOpacity),
				borderWidth: bgBorderWidth,
				borderStyle: "solid",
				borderRadius: bgBorderRadius,
				padding: bgPadding,
				maxWidth: "95vw",
				maxHeight: "95vh",
				boxSizing: "border-box",
			}
		: {};

	// TEXT branch — opacity intentionally not applied: text must stay fully readable
	if (item.type === "TEXT") {
		const inner = (
			<>
				<AuthorBadge
					username={item.author_username}
					displayName={item.author_display_name}
					avatarUrl={item.author_avatar_url}
				/>
				<TextDisplay
					text={item.text}
					width={width}
					textSize={settings.textSize}
					textColor={settings.textColor}
				/>
			</>
		);

		if (bgEnabled) {
			return (
				<div style={bgWrapperStyle} className="flex flex-col items-center gap-2">
					{inner}
				</div>
			);
		}

		return <div className="flex flex-col items-center gap-2">{inner}</div>;
	}

	// MEDIA branch — item is narrowed to MediaQueueItem here
	const opacity = settings.mediaOpacity / 100;

	const mediaContent = (
		<>
			{/* ── Author badge — always fully opaque ── */}
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
					style={{
						maxWidth: width,
						maxHeight: "80vh",
						width: "auto",
						height: "auto",
						background: "transparent",
						opacity,
					}}
					className="rounded-xl block transition-opacity duration-300"
				/>
			)}

			{/* ── Image / GIF ── */}
			{(item.media_type === "image" || item.media_type === "gif") && (
				<img
					src={item.media_url}
					alt=""
					onLoad={startTimer}
					onError={onMediaError}
					style={{ maxWidth: width, maxHeight: "80vh", opacity }}
					className="rounded-xl block transition-opacity duration-300"
					draggable={false}
				/>
			)}

			{/* ── Audio ── */}
			{item.media_type === "audio" && (
				<div
					style={{ maxWidth: width, opacity }}
					className={
						bgEnabled
							? "rounded-xl flex flex-col items-center gap-3 transition-opacity duration-300"
							: "rounded-xl bg-black/70 backdrop-blur-lg p-6 flex flex-col items-center gap-3 transition-opacity duration-300"
					}
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
							style={{ textShadow: CAPTION_SHADOW, color: settings.textColor }}
							className="text-sm font-semibold text-center leading-snug line-clamp-2 overflow-hidden w-full"
						>
							<InlineText text={item.text} />
						</p>
					)}
				</div>
			)}

			{/* ── Sticker ── */}
			{item.media_type === "sticker" && (
				<img
					src={item.media_url}
					alt=""
					onLoad={startTimer}
					onError={onMediaError}
					style={{ maxWidth: STICKER_MAX_SIZE, maxHeight: STICKER_MAX_SIZE, opacity }}
					className="block transition-opacity duration-300"
					draggable={false}
				/>
			)}

			{/* ── Caption (image / gif / video / sticker) — always fully opaque ── */}
			{item.media_type !== "audio" && item.text && (
				<p
					style={{ maxWidth: width, textShadow: CAPTION_SHADOW, color: settings.textColor }}
					className="text-sm font-semibold text-center leading-snug line-clamp-2 overflow-hidden px-2"
				>
					<InlineText text={item.text} />
				</p>
			)}
		</>
	);

	if (bgEnabled) {
		return (
			<div style={bgWrapperStyle} className="flex flex-col items-center gap-2">
				{mediaContent}
			</div>
		);
	}

	return <div className="flex flex-col items-center gap-2">{mediaContent}</div>;
}
