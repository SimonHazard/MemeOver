import { Avatar, AvatarFallback, AvatarImage } from "@memeover/ui/components/ui/avatar";
import { Button } from "@memeover/ui/components/ui/button";
import { Card } from "@memeover/ui/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@memeover/ui/components/ui/tooltip";
import { NB_BTN_DISABLED, NB_HOVER_SHADOW_SM } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import {
	Clapperboard,
	EyeOff,
	FileAudio,
	ImageIcon,
	MessageSquare,
	Play,
	Sticker,
	Video,
} from "lucide-react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { formatDate, formatTime } from "@/shared/helpers";
import type { HistoryItem } from "@/shared/history";
import { isMediaExpired } from "@/shared/history-expiry";
import { canMuteAuthor } from "@/shared/muted-authors";
import { InlineText } from "@/windows/overlay/components/text-bubble";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryItemCardProps {
	item: HistoryItem;
	onReplay: (item: HistoryItem) => void;
	onMuteAuthor?: (item: HistoryItem) => void;
	disabled?: boolean;
}

// ─── Media type config ────────────────────────────────────────────────────────

type MediaIconConfig = {
	icon: React.ComponentType<{ className?: string }>;
	labelKey: string;
};

function getMediaConfig(item: HistoryItem): MediaIconConfig {
	if (item.type === "TEXT") return { icon: MessageSquare, labelKey: "display.type_text" };
	switch (item.media_type) {
		case "gif":
			return { icon: Clapperboard, labelKey: "display.type_gif" };
		case "video":
			return { icon: Video, labelKey: "display.type_video" };
		case "audio":
			return { icon: FileAudio, labelKey: "display.type_audio" };
		case "sticker":
			return { icon: Sticker, labelKey: "display.type_sticker" };
		default:
			return { icon: ImageIcon, labelKey: "display.type_image" };
	}
}

// ─── MediaTypeBadge ───────────────────────────────────────────────────────────

function MediaTypeBadge({ item }: { item: HistoryItem }) {
	const { t } = useTranslation();
	const { icon: Icon, labelKey } = getMediaConfig(item);
	return (
		<span className="inline-flex items-center gap-1 border border-foreground/25 rounded px-1.5 py-0.5 text-[10px] font-display tracking-wide text-muted-foreground shrink-0">
			<Icon className="h-2.5 w-2.5" />
			{t(labelKey)}
		</span>
	);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryItemCard({
	item,
	onReplay,
	onMuteAuthor,
	disabled = false,
}: HistoryItemCardProps) {
	const { t } = useTranslation();
	const expired = isMediaExpired(item, Date.now());
	const displayName = item.author_display_name ?? item.author_username;
	const initials = displayName.charAt(0).toUpperCase();

	return (
		<Card
			className={cn(
				"px-4 py-3 border-2 border-foreground/20 hover:border-foreground/60 transition-[border-color,box-shadow] duration-150 ease-out",
				NB_HOVER_SHADOW_SM,
			)}
		>
			<div className="flex items-center gap-3">
				{/* ── Avatar ── */}
				<Avatar className="w-8 h-8 shrink-0 border-2 border-foreground/20">
					<AvatarImage src={item.author_avatar_url} alt={displayName} />
					<AvatarFallback className="text-xs font-display">{initials}</AvatarFallback>
				</Avatar>

				{/* ── Info column ── */}
				<div className="flex-1 min-w-0 space-y-1">
					{/* Row 1 — Username */}
					<p className="text-sm font-display tracking-wide truncate leading-none">{displayName}</p>

					{/* Row 2 — Date · time · type badge */}
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[11px] text-muted-foreground">
							{formatDate(item.recordedAt)} · {formatTime(item.recordedAt)}
						</span>
						<MediaTypeBadge item={item} />
						{expired && (
							<span className="border border-destructive/40 rounded px-1.5 py-0.5 text-[10px] font-display text-muted-foreground">
								{t("history.expired")}
							</span>
						)}
					</div>

					{/* Row 3 — Text preview (TEXT items only) */}
					{item.type === "TEXT" && item.text && (
						<p className="text-xs text-muted-foreground/70 truncate italic">
							<InlineText text={item.text} />
						</p>
					)}
				</div>

				{!expired &&
					item.type === "MEDIA" &&
					["image", "gif", "sticker"].includes(item.media_type) && (
						<img
							src={item.media_url}
							width={32}
							height={32}
							loading="lazy"
							alt=""
							className="h-8 w-8 object-cover rounded shrink-0"
							onError={(event) => {
								event.currentTarget.style.display = "none";
							}}
						/>
					)}
				{onMuteAuthor && canMuteAuthor(item) && (
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									variant="outline"
									size="icon"
									aria-label={t("history.muteAuthor")}
									onClick={() => onMuteAuthor(item)}
									className="shrink-0 border-2 border-foreground/30"
								/>
							}
						>
							<EyeOff className="h-3.5 w-3.5" />
						</TooltipTrigger>
						<TooltipContent>{t("history.muteAuthor")}</TooltipContent>
					</Tooltip>
				)}
				{/* ── Replay button ── */}
				<Tooltip>
					<TooltipTrigger render={<span tabIndex={expired ? 0 : undefined} />}>
						<Button
							variant="outline"
							size="icon"
							className={cn(
								"shrink-0 border-2 border-foreground/30",
								cn("hover:border-foreground hover:bg-primary-400/10", NB_HOVER_SHADOW_SM),
								"active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-[translate,box-shadow,border-color,background-color] duration-150 ease-out",
								NB_BTN_DISABLED,
							)}
							title={expired ? undefined : t("history.replay")}
							aria-label={t("history.replay")}
							disabled={disabled || expired}
							onClick={() => onReplay(item)}
						>
							<Play className="h-3.5 w-3.5" />
						</Button>
					</TooltipTrigger>
					{expired && <TooltipContent>{t("history.expiredHint")}</TooltipContent>}
				</Tooltip>
			</div>
		</Card>
	);
}
