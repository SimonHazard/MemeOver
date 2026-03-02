import { FileAudio, MessageSquare, Play, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, formatTime } from "@/shared/helpers";
import type { HistoryItem } from "@/shared/history";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryItemCardProps {
	item: HistoryItem;
	onReplay: (item: HistoryItem) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryItemCard({ item, onReplay }: HistoryItemCardProps) {
	const { t } = useTranslation();
	const displayName = item.author_display_name ?? item.author_username;

	return (
		<Card className="p-3 flex items-center gap-3 border-2 border-foreground/20 hover:border-foreground/60 hover:shadow-[2px_2px_0px_0px_var(--nb-shadow)] transition-all">
			{/* Thumbnail / type icon */}
			<MediaThumbnail item={item} />

			{/* Author + content */}
			<div className="flex-1 min-w-0 space-y-0.5">
				<div className="flex items-center gap-1.5">
					<Avatar className="w-4 h-4 shrink-0">
						<AvatarImage src={item.author_avatar_url} alt="" />
						<AvatarFallback className="text-[6px]">
							{displayName.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<span className="text-xs font-medium truncate">{displayName}</span>
					<span className="text-xs text-muted-foreground shrink-0 ml-auto">
						{formatDate(item.recordedAt)} {formatTime(item.recordedAt)}
					</span>
				</div>

				{item.type === "TEXT" ? (
					<p className="text-xs text-muted-foreground truncate">{item.text}</p>
				) : (
					<p className="text-xs text-muted-foreground truncate">
						{t("history.from", { name: displayName })}
					</p>
				)}
			</div>

			{/* Replay button */}
			<Button
				variant="outline"
				size="icon"
				className="shrink-0 border-2 border-foreground/30 hover:border-foreground hover:shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
				title={t("history.replay")}
				onClick={() => onReplay(item)}
			>
				<Play className="h-3.5 w-3.5" />
			</Button>
		</Card>
	);
}

// ─── MediaThumbnail ───────────────────────────────────────────────────────────

function MediaThumbnail({ item }: { item: HistoryItem }) {
	if (item.type === "TEXT") {
		return (
			<div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
				<MessageSquare className="h-4 w-4 text-muted-foreground" />
			</div>
		);
	}

	if (item.media_type === "image" || item.media_type === "gif") {
		return (
			<img
				src={item.media_url}
				alt=""
				className="w-10 h-10 object-cover rounded bg-muted shrink-0"
				loading="lazy"
			/>
		);
	}

	if (item.media_type === "video") {
		return (
			<div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
				<Video className="h-4 w-4 text-muted-foreground" />
			</div>
		);
	}

	// audio
	return (
		<div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
			<FileAudio className="h-4 w-4 text-muted-foreground" />
		</div>
	);
}
