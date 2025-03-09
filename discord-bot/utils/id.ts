import { randomBytes } from "node:crypto";
import { websocketConnectionsWithKey } from "../src/bot";

// Generate unique ID
export function generateUniqueID(): string {
	const charset =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const length = 6;
	let result = "";

	const randomBytesBuffer = randomBytes(length);
	for (let i = 0; i < length; i++) {
		const randomIndex = randomBytesBuffer[i] % charset.length;
		result += charset[randomIndex];
	}

	return result;
}

// Ensure ID is unique
export function getUniqueID(): string {
	while (true) {
		const id = generateUniqueID();
		if (!websocketConnectionsWithKey.has(id)) {
			return id;
		}
	}
}
