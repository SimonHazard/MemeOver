import { useQuery } from "@tanstack/react-query";
import { type SourceConnection, sourceConnection } from "@/shared/browser-source";
import { readSourceHeartbeat } from "@/shared/stream-controls";

const HEARTBEAT_REFRESH_MS = 2000;

/**
 * What a loaded browser source last reported, refreshed while `enabled`. Shared by the Stream
 * tab's status and the Overlay tab's Skip button through the same query.
 */
export function useSourceConnection(enabled: boolean): SourceConnection {
	const { data: heartbeat = null } = useQuery({
		queryKey: ["browserSourceHeartbeat"],
		queryFn: readSourceHeartbeat,
		staleTime: 0,
		refetchInterval: HEARTBEAT_REFRESH_MS,
		enabled,
	});
	return enabled ? sourceConnection(heartbeat) : "waiting";
}
