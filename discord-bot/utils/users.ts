import { usersByGuildId } from "../src/bot";

// Remove connection from usersByGuildId
export function removeFromUsersByGuildId(connectionKey: string): void {
	for (const [guildID, connections] of usersByGuildId.entries()) {
		const index = connections.indexOf(connectionKey);
		if (index !== -1) {
			connections.splice(index, 1);
			usersByGuildId.set(guildID, connections);
			break;
		}
	}
}
