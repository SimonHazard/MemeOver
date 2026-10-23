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

	setClientId(wsId: string, clientId: string | undefined): void {
		const client = clients.get(wsId);
		if (client && clientId) client.client_id = clientId;
	},

	getGuildMembers(guildId: string): Set<string> {
		return guildRooms.get(guildId) ?? new Set();
	},

	/**
	 * Distinct app installs in a guild. A half-open socket awaiting heartbeat eviction and its
	 * replacement count once; legacy clients without a client_id count per socket.
	 */
	getGuildPresenceCount(guildId: string): number {
		const installs = new Set<string>();
		for (const wsId of guildRooms.get(guildId) ?? []) {
			const clientId = clients.get(wsId)?.client_id;
			installs.add(clientId ? `client:${clientId}` : `ws:${wsId}`);
		}
		return installs.size;
	},

	isClientInGuild(wsId: string, guildId: string): boolean {
		return clients.get(wsId)?.joined_guilds.has(guildId) ?? false;
	},

	getGuildCount(): number {
		return guildRooms.size;
	},

	getJoinedClientCount(): number {
		const wsIds = new Set<string>();
		for (const room of guildRooms.values()) {
			for (const wsId of room) {
				wsIds.add(wsId);
			}
		}
		return wsIds.size;
	},

	getAllGuildIds(): string[] {
		return Array.from(guildRooms.keys());
	},

	getAllClients(): ClientState[] {
		return Array.from(clients.values());
	},
};
