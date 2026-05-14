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
				className="inline-flex size-10 cursor-pointer items-center justify-center rounded-lg border-2 border-foreground bg-background shadow-[2px_2px_0px_0px_var(--nb-shadow)] transition-[box-shadow,transform,background-color] duration-200 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			>
				{open ? (
					<X className="size-5" aria-hidden="true" />
				) : (
					<Menu className="size-5" aria-hidden="true" />
				)}
			</button>

			{open && (
				<nav className="absolute left-0 right-0 top-full z-30 flex flex-col gap-3 border-b-2 border-foreground bg-background p-4 shadow-[0_4px_0px_0px_var(--nb-shadow)]">
					{links.map((link) => (
						<a
							key={link.href}
							href={link.href}
							onClick={() => setOpen(false)}
							className="rounded-lg px-3 py-2 font-display text-sm tracking-wide transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
						>
							{link.label}
						</a>
					))}
					<a
						href={downloadHref}
						onClick={() => setOpen(false)}
						className="inline-flex items-center justify-center rounded-lg border-2 border-foreground bg-primary px-4 py-2 font-display text-sm tracking-wide text-primary-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] transition-[box-shadow,transform] duration-200 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
					>
						{downloadLabel}
					</a>
				</nav>
			)}
		</div>
	);
}
