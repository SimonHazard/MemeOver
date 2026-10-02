export function numberDirection(previous: number, next: number): -1 | 0 | 1 {
	return next === previous ? 0 : next > previous ? 1 : -1;
}
