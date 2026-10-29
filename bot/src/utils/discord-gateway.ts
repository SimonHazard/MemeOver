/** Shards Discord closed for good (token, intents, sharding): discord.js will not reconnect them. */

const lostShards = new Map<number, number>();

export function markShardLost(shardId: number, closeCode: number): void {
	lostShards.set(shardId, closeCode);
}

export function markShardReady(shardId: number): void {
	lostShards.delete(shardId);
}

/** False once any shard is lost: the WebSocket server still runs but no Discord event arrives. */
export function isDiscordGatewayUsable(): boolean {
	return lostShards.size === 0;
}
