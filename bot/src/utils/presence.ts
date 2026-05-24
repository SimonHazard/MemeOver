import { ActivityType, type Client, type ClientPresenceStatus } from "discord.js";
import pkg from "../../package.json";
import { logger } from "./logger";
import { guildRegistry } from "./registry";
import { store } from "./store";

const log = logger.child({ module: "presence" });

const PRESENCE_REFRESH_DEBOUNCE_MS = 15_000;

let client: Client | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let lastSignature: string | null = null;

function plural(count: number, singular: string, pluralLabel = `${singular}s`): string {
	return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function buildPresence(): {
	status: ClientPresenceStatus;
	activityName: string;
} {
	const activeOverlays = store.getJoinedClientCount();
	const activeGuilds = store.getGuildCount();
	const registeredGuilds = guildRegistry.getRegisteredCount();

	if (activeOverlays > 0) {
		return {
			status: "online",
			activityName: `${plural(activeOverlays, "overlay")} on ${plural(activeGuilds, "server")}`,
		};
	}

	if (registeredGuilds > 0) {
		return {
			status: "idle",
			activityName: `${plural(registeredGuilds, "configured server")}`,
		};
	}

	return {
		status: "idle",
		activityName: "/memeover setup",
	};
}

async function refreshPresence(): Promise<void> {
	if (!client?.user) return;

	const presence = buildPresence();
	const signature = `${presence.status}:${presence.activityName}`;
	if (signature === lastSignature) return;

	lastSignature = signature;

	try {
		await client.user.setPresence({
			status: presence.status,
			activities: [
				{
					name: presence.activityName,
					type: ActivityType.Watching,
				},
			],
		});
		log.info(
			{ event: "presence_updated", status: presence.status, activity: presence.activityName },
			"Discord presence updated",
		);
	} catch (err) {
		log.warn({ event: "presence_update_failed", err }, "Failed to update Discord presence");
	}
}

export function attachPresenceClient(discordClient: Client): void {
	client = discordClient;
	void refreshPresence();
	log.info({ event: "presence_attached", version: pkg.version }, "Discord presence attached");
}

export function schedulePresenceRefresh(): void {
	if (!client?.user) return;
	if (refreshTimer) return;

	refreshTimer = setTimeout(() => {
		refreshTimer = null;
		void refreshPresence();
	}, PRESENCE_REFRESH_DEBOUNCE_MS);
}
