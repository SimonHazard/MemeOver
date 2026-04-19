import type React from "react";
import type { DisplayQueueItem, Settings, TextPosition } from "@/shared/types";
import { AudioEqualizer } from "./audio-equalizer";
import { AuthorBadge } from "./author-badge";
import { InlineText, TextDisplay } from "./text-bubble";

const CAPTION_SHADOW = "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000";
// Impact-style stroke — a denser 4-directional outline for overlay captions
const OVERLAY_CAPTION_SHADOW =
	"-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000";
// Discord stickers are fixed-size transparent assets — not scaled by mediaSize
const STICKER_MAX_SIZE = "256px";

function hexToRgba(hex: string, opacity: number): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
}

function isOverlayMode(pos: TextPosition): boolean {
	return pos === "overlay-top" || pos === "overlay-middle" || pos === "overlay-bottom";
}

function overlayAnchorClass(pos: TextPosition): string {
	if (pos === "overlay-top") return "top-2 left-1/2 -translate-x-1/2";
	if (pos === "overlay-middle") return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
	return "bottom-2 left-1/2 -translate-x-1/2"; // overlay-bottom
}

// ─── Caption variants ─────────────────────────────────────────────────────────

function InlineCaption({
	text,
	width,
	color,
	fontSize,
}: {
	text: string;
	width: string;
	color: string;
	fontSize: number;
}) {
	return (
		<p
			style={{ maxWidth: width, textShadow: CAPTION_SHADOW, color, fontSize }}
			className="font-semibold text-center leading-snug line-clamp-2 overflow-hidden px-2"
		>
			<InlineText text={text} />
		</p>
	);
}

function OverlayCaption({
	text,
	color,
	fontSize,
	anchorClass,
}: {
	text: string;
	color: string;
	fontSize: number;
	anchorClass: string;
}) {
	return (
		<p
			style={{
				textShadow: OVERLAY_CAPTION_SHADOW,
				color,
				fontSize,
			}}
			className={`absolute ${anchorClass} w-[92%] font-black uppercase text-center leading-tight tracking-wide line-clamp-3 overflow-hidden pointer-events-none`}
		>
			<InlineText text={text} emojiHeight={`${fontSize * 1.1}px`} />
		</p>
	);
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
		textPosition,
		textSize,
		textColor,
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
				<TextDisplay text={item.text} width={width} textSize={textSize} textColor={textColor} />
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
	const caption = item.text ?? "";
	// Audio has its own layout with an integrated caption — external caption modes don't apply.
	const hasCaption = item.media_type !== "audio" && caption.length > 0;
	const useOverlay = hasCaption && isOverlayMode(textPosition);
	const useInlineCaption = hasCaption && !useOverlay;

	const mediaNode = (() => {
		if (item.media_type === "video") {
			return (
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
			);
		}
		if (item.media_type === "image" || item.media_type === "gif") {
			return (
				<img
					src={item.media_url}
					alt=""
					onLoad={startTimer}
					onError={onMediaError}
					style={{ maxWidth: width, maxHeight: "80vh", opacity }}
					className="rounded-xl block transition-opacity duration-300"
					draggable={false}
				/>
			);
		}
		if (item.media_type === "audio") {
			return (
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
					{caption && (
						<p
							style={{ textShadow: CAPTION_SHADOW, color: textColor, fontSize: textSize }}
							className="font-semibold text-center leading-snug line-clamp-2 overflow-hidden w-full"
						>
							<InlineText text={caption} />
						</p>
					)}
				</div>
			);
		}
		// Sticker
		return (
			<img
				src={item.media_url}
				alt=""
				onLoad={startTimer}
				onError={onMediaError}
				style={{ maxWidth: STICKER_MAX_SIZE, maxHeight: STICKER_MAX_SIZE, opacity }}
				className="block transition-opacity duration-300"
				draggable={false}
			/>
		);
	})();

	// When using an overlay caption, wrap the media in a tight relative box so the
	// absolute caption is bounded by the rendered media (not by the wider bg container).
	const mediaWithOverlayCaption = useOverlay ? (
		<div className="relative inline-block">
			{mediaNode}
			<OverlayCaption
				text={caption}
				color={textColor}
				fontSize={textSize}
				anchorClass={overlayAnchorClass(textPosition)}
			/>
		</div>
	) : (
		mediaNode
	);

	const inlineCaptionNode = useInlineCaption ? (
		<InlineCaption text={caption} width={width} color={textColor} fontSize={textSize} />
	) : null;

	const mediaContent = (
		<>
			<AuthorBadge
				username={item.author_username}
				displayName={item.author_display_name}
				avatarUrl={item.author_avatar_url}
			/>
			{textPosition === "above" && inlineCaptionNode}
			{mediaWithOverlayCaption}
			{textPosition === "below" && inlineCaptionNode}
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
