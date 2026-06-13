import { buildConnectionCode, parseConnectionCode } from "@memeover/shared";
import { invoke } from "@tauri-apps/api/core";

export const SERVER_CREATOR_DEFAULT_PORT = 3001;
export const DISCORD_DEVELOPER_PORTAL_URL = "https://discord.com/developers/applications";
export const DISCORD_INVITE_PERMISSIONS = 68608;

export interface ServerCreatorStatus {
	platform: string;
	defaultInstallDir: string;
	installDir: string;
	sourceDir: string;
	botDir: string;
	installed: boolean;
	configured: boolean;
	bunAvailable: boolean;
	bunPath: string | null;
	gitAvailable: boolean;
	running: boolean;
	healthy: boolean;
	healthUrl: string;
	localWsUrl: string;
}

export interface ServerInstallRequest {
	installDir: string;
	discordToken: string;
	discordClientId: string;
	wsPort: number;
	publicWsUrl: string;
	repair: boolean;
}

export interface ServerInstallResult {
	installDir: string;
	localWsUrl: string;
	publicWsUrl: string;
}

export function createPublicWsUrl(ipOrHost: string, port: number): string {
	const host = ipOrHost.trim();
	if (!host) return `ws://YOUR_PUBLIC_IP:${port}/ws`;
	if (host.startsWith("ws://") || host.startsWith("wss://")) return host;
	return `ws://${host}:${port}/ws`;
}

export function createDiscordInviteUrl(clientId: string, administrator = false): string | null {
	const id = clientId.trim();
	if (!/^\d{17,20}$/.test(id)) return null;
	const permissions = administrator ? 8 : DISCORD_INVITE_PERMISSIONS;
	const params = new URLSearchParams({
		client_id: id,
		scope: "bot applications.commands",
		permissions: String(permissions),
	});
	return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function createFriendSetupCode({
	guildId,
	token,
	wsUrl,
}: {
	guildId: string;
	token: string;
	wsUrl: string;
}): string | null {
	if (!guildId || !token || !wsUrl) return null;
	return buildConnectionCode({ guildId, token, wsUrl });
}

export function parseServerSetupCode(raw: string) {
	return parseConnectionCode(raw);
}

export function serverCreatorStatus(installDir?: string, port?: number) {
	return invoke<ServerCreatorStatus>("server_creator_status", { installDir, port });
}

export function serverCreatorInstall(request: ServerInstallRequest) {
	return invoke<ServerInstallResult>("server_creator_install", { request });
}

export function serverCreatorInstallBun() {
	return invoke<void>("server_creator_install_bun");
}

export function serverCreatorStart(installDir?: string) {
	return invoke<void>("server_creator_start", { installDir });
}

export function serverCreatorStop() {
	return invoke<void>("server_creator_stop");
}

export function serverCreatorRestart(installDir?: string) {
	return invoke<void>("server_creator_restart", { installDir });
}

export function serverCreatorLogs() {
	return invoke<string[]>("server_creator_logs");
}

export function serverCreatorPublicIp() {
	return invoke<string>("server_creator_public_ip");
}
