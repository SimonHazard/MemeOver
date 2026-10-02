export function createMemoryStoreModule() {
	const stores = new Map<string, Map<string, unknown>>();
	const saves = new Map<string, number>();
	return {
		stores,
		saves,
		module: {
			Store: {
				async load(name: string) {
					let values = stores.get(name);
					if (!values) {
						values = new Map();
						stores.set(name, values);
					}
					const data = values;
					return {
						async get<T>(key: string) {
							return data.get(key) as T | undefined;
						},
						async set(key: string, value: unknown) {
							data.set(key, value);
						},
						async save() {
							saves.set(name, (saves.get(name) ?? 0) + 1);
						},
					};
				},
			},
		},
	};
}
export function createEventModule() {
	const emitted: { event: string; payload?: unknown }[] = [];
	return {
		emitted,
		module: {
			async emit(event: string, payload?: unknown) {
				emitted.push({ event, payload });
			},
			async listen() {
				return () => {};
			},
		},
	};
}
