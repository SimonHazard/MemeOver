import { Menu, X } from "lucide-react";
import { useState } from "react";

interface Props {
	links: Array<{ href: string; label: string }>;
	downloadHref: string;
	downloadLabel: string;
}

export default function MobileMenu({ links, downloadHref, downloadLabel }: Props) {
	const [open, setOpen] = useState(false);

	return (
		<div className="md:hidden">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				aria-label="Toggle menu"
				aria-expanded={open}
				className="inline-flex items-center justify-center size-10 rounded-lg border-2 border-foreground bg-background shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
			>
				{open ? <X className="size-5" /> : <Menu className="size-5" />}
			</button>

			{open && (
				<nav className="absolute top-full left-0 right-0 bg-background border-b-2 border-foreground p-4 flex flex-col gap-3 z-50 shadow-[0_4px_0px_0px_var(--nb-shadow)]">
					{links.map((link) => (
						<a
							key={link.href}
							href={link.href}
							onClick={() => setOpen(false)}
							className="font-display tracking-wide text-sm px-3 py-2 rounded-lg hover:bg-accent transition-colors"
						>
							{link.label}
						</a>
					))}
					<a
						href={downloadHref}
						onClick={() => setOpen(false)}
						className="inline-flex items-center justify-center font-display tracking-wide text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
					>
						{downloadLabel}
					</a>
				</nav>
			)}
		</div>
	);
}
