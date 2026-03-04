import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AuthorBadgeProps {
	username: string;
	displayName?: string;
	avatarUrl: string;
}

export function AuthorBadge({ username, displayName, avatarUrl }: AuthorBadgeProps) {
	const name = displayName ?? username;
	return (
		<div
			className="flex items-center gap-1.5 self-start
		                bg-black/65 backdrop-blur-md rounded-full
		                px-2.5 py-1 ring-1 ring-white/10"
		>
			<Avatar className="w-5 h-5 shrink-0">
				<AvatarImage src={avatarUrl} alt="" />
				<AvatarFallback className="text-[8px]">{name.charAt(0).toUpperCase()}</AvatarFallback>
			</Avatar>
			<span className="text-white text-xs font-semibold leading-none whitespace-nowrap">
				{name}
			</span>
		</div>
	);
}
