import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

interface Props {
	links: Array<{ href: string; label: string }>;
	downloadHref: string;
	downloadLabel: string;
	menuLabel: string;
	toggleLabel: string;
}

export default function MobileMenu({
	links,
	downloadHref,
	downloadLabel,
	menuLabel,
	toggleLabel,
}: Props) {
	const [open, setOpen] = useState(false);
	const menuId = useId(),
		trigger = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!open) return;
		const close = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
				trigger.current?.focus();
			}
		};
		document.addEventListener("keydown", close);
		return () => document.removeEventListener("keydown", close);
	}, [open]);

	return (
		<div className="lg:hidden" data-open={open}>
			<button
				type="button"
				onClick={() => setOpen(!open)}
				ref={trigger}
				aria-label={toggleLabel}
				aria-controls={menuId}
				aria-expanded={open}
				className="inline-flex size-10 cursor-pointer items-center justify-center rounded-lg border-2 border-foreground bg-background shadow-[2px_2px_0px_0px_var(--nb-shadow)] transition-[box-shadow,transform,translate,background-color] ease-out duration-200 motion-safe:active:translate-x-0.5 motion-safe:active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
			>
				<span className="relative h-5 w-5" aria-hidden="true">
					<Menu className="menu-open-icon absolute inset-0 size-5" />
					<X className="menu-close-icon absolute inset-0 size-5" />
				</span>
			</button>

			<nav
				id={menuId}
				aria-label={menuLabel}
				data-open={open}
				className="mobile-menu-panel absolute left-0 right-0 top-full z-30 flex flex-col gap-3 border-b-2 border-foreground bg-background p-4 shadow-[0_4px_0px_0px_var(--nb-shadow)]"
			>
				{links.map((link) => (
					<a
						key={link.href}
						href={link.href}
						onClick={() => setOpen(false)}
						{...(link.href.startsWith("http")
							? { target: "_blank", rel: "noopener noreferrer" }
							: {})}
						className="rounded-lg px-3 py-2 font-display text-sm tracking-wide transition-colors duration-200 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
					>
						{link.label}
					</a>
				))}
				<a
					href={downloadHref}
					onClick={() => setOpen(false)}
					className="inline-flex items-center justify-center rounded-lg border-2 border-foreground bg-primary px-4 py-2 font-display text-sm tracking-wide text-primary-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] transition-[box-shadow,transform,translate] ease-out duration-200 motion-safe:active:translate-x-0.5 motion-safe:active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
				>
					{downloadLabel}
				</a>
			</nav>
		</div>
	);
}
