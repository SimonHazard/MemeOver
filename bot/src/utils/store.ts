import type { ClientState, WSConnection } from "./types";

// wsId → client state
const clients = new Map<string, ClientState>();

// guildId → Set<wsId> (inverse index for O(1) broadcast lookup)
const guildRooms = new Map<string, Set<string>>();

export const store = {
	addClient(wsId: string, wsRef: WSConnection): void {
		clients.set(wsId, {
			ws_id: wsId,
			ws_ref: wsRef,
			joined_guilds: new Set(),
		});
	},

	removeClient(wsId: string): void {
		const client = clients.get(wsId);
		if (!client) return;

		// Clean up inverse index for every guild this client was in
		for (const guildId of client.joined_guilds) {
			const room = guildRooms.get(guildId);
			if (room) {
				room.delete(wsId);
				if (room.size === 0) {
					guildRooms.delete(guildId);
				}
			}
		}

		clients.delete(wsId);
	},

	joinGuild(wsId: string, guildId: string): void {
		const client = clients.get(wsId);
		if (!client) return;

		client.joined_guilds.add(guildId);

		let room = guildRooms.get(guildId);
		if (!room) {
			room = new Set();
			guildRooms.set(guildId, room);
		}
		room.add(wsId);
	},

	leaveGuild(wsId: string, guildId: string): void {
		const client = clients.get(wsId);
		if (!client) return;

		client.joined_guilds.delete(guildId);

		const room = guildRooms.get(guildId);
		if (room) {
			room.delete(wsId);
			if (room.size === 0) {
				guildRooms.delete(guildId);
			}
		}
	},

	getClient(wsId: string): ClientState | undefined {
		return clients.get(wsId);
	},

	getGuildMembers(guildId: string): Set<string> {
		return guildRooms.get(guildId) ?? new Set();
	},

	isClientInGuild(wsId: string, guildId: string): boolean {
		return clients.get(wsId)?.joined_guilds.has(guildId) ?? false;
	},

	getAllGuildIds(): string[] {
		return Array.from(guildRooms.keys());
	},

	getAllClients(): ClientState[] {
		return Array.from(clients.values());
	},
};
