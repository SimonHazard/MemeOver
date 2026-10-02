import { EASE_OUT } from "@memeover/ui/lib/motion";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { type ReactNode, useState } from "react";
export function AnimatedList<T>({
	items,
	itemKey,
	renderItem,
	empty,
	loading,
	skeleton,
}: {
	items: T[];
	itemKey: (item: T) => string;
	renderItem: (item: T) => ReactNode;
	empty: ReactNode;
	loading?: boolean;
	skeleton?: ReactNode;
}) {
	const reduced = useReducedMotion(),
		keys = items.map(itemKey),
		signature = JSON.stringify(keys);
	const [firstKeys, setFirstKeys] = useState<string[] | null>(
		items.length ? keys.slice(0, 6) : null,
	);
	const [previous, setPrevious] = useState({ signature, keys }),
		[emptyReady, setEmptyReady] = useState(!items.length),
		[removedKeys, setRemovedKeys] = useState<string[]>([]);
	if (firstKeys === null && items.length) setFirstKeys(keys.slice(0, 6));
	if (previous.signature !== signature) {
		setRemovedKeys(previous.keys.filter((key) => !keys.includes(key)));
		setPrevious({ signature, keys });
		if (!items.length && previous.keys.length) setEmptyReady(false);
		if (items.length) setEmptyReady(false);
	}
	return (
		<div className="space-y-2">
			<AnimatePresence initial={false}>
				{loading && (
					<motion.div
						key="skeleton"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
					>
						{skeleton}
					</motion.div>
				)}
			</AnimatePresence>
			<AnimatePresence
				initial={!reduced}
				custom={removedKeys}
				onExitComplete={() => {
					if (!items.length) setEmptyReady(true);
				}}
			>
				{items.map((item) => {
					const key = itemKey(item),
						initialIndex = firstKeys?.indexOf(key) ?? -1;
					return (
						<motion.div
							key={key}
							onAnimationComplete={() => {
								if (firstKeys && key === firstKeys[firstKeys.length - 1]) setFirstKeys([]);
							}}
							layout={!reduced}
							initial={{ opacity: 0, y: reduced ? 0 : -8 }}
							animate={{
								opacity: 1,
								y: 0,
								transition: {
									duration: reduced ? 0.12 : 0.2,
									ease: EASE_OUT,
									delay: !reduced && initialIndex >= 0 ? initialIndex * 0.03 : 0,
								},
							}}
							exit="removed"
							variants={{
								removed: (removed: string[]) => ({
									opacity: 0,
									scale: reduced ? 1 : 0.97,
									transition: {
										duration: reduced ? 0.1 : 0.12,
										ease: EASE_OUT,
										delay:
											!reduced && removed.length > 1
												? Math.min(5, Math.max(0, removed.length - 1 - removed.indexOf(key))) * 0.02
												: 0,
									},
								}),
							}}
						>
							{renderItem(item)}
						</motion.div>
					);
				})}
			</AnimatePresence>
			<AnimatePresence>
				{!loading && !items.length && emptyReady && (
					<motion.div
						key="empty"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
					>
						{empty}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
