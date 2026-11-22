import { useQuery, useQueryClient } from "@tanstack/react-query";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTauriEventVersion } from "@/hooks/useTauriEvent";
import { hasRequiredScopes } from "@/shared/twitch/auth";
import { clearTwitchAuth, loadTwitchAuth, saveTwitchAuth } from "@/shared/twitch/auth-store";
import { TWITCH_CLIENT_ID } from "@/shared/twitch/config";
import {
	pollDeviceToken,
	revokeToken,
	startDeviceFlow,
	validateToken,
} from "@/shared/twitch/oauth";

export type TwitchConnectState =
	| { phase: "idle" | "starting" }
	| { phase: "awaiting_user"; userCode: string; verificationUri: string }
	| { phase: "failed"; reason: "denied" | "expired" | "network" | "wrong_scopes" };

/** One wait at a time; abort settles it as well as clearing its timer. */
function waitForPoll(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		if (signal.aborted) return resolve();
		const done = () => {
			clearTimeout(timer);
			signal.removeEventListener("abort", done);
			resolve();
		};
		const timer = setTimeout(done, ms);
		signal.addEventListener("abort", done, { once: true });
	});
}

export function useTwitchConnect() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [state, setState] = useState<TwitchConnectState>({ phase: "idle" });
	const [disconnecting, setDisconnecting] = useState(false);
	const mounted = useRef(false);
	const operation = useRef<AbortController | null>(null);
	const authVersion = useTauriEventVersion("twitch-auth-changed");
	const { data: auth, isPending: loading } = useQuery({
		queryKey: ["twitch-auth"],
		queryFn: loadTwitchAuth,
		staleTime: 0,
	});
	useEffect(() => {
		if (authVersion > 0) void queryClient.invalidateQueries({ queryKey: ["twitch-auth"] });
	}, [authVersion, queryClient]);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			operation.current?.abort();
		};
	}, []);
	const cancel = useCallback(() => {
		operation.current?.abort();
		operation.current = null;
		if (mounted.current) setState({ phase: "idle" });
	}, []);
	const connect = useCallback(async () => {
		if (operation.current || !mounted.current) return;
		const controller = new AbortController();
		operation.current = controller;
		const active = () => mounted.current && !controller.signal.aborted;
		const deps = { fetch, clientId: TWITCH_CLIENT_ID, signal: controller.signal };
		const revoke = (token: string) =>
			revokeToken({ fetch, clientId: TWITCH_CLIENT_ID }, token).catch(() => {});
		setState({ phase: "starting" });
		try {
			const flow = await startDeviceFlow(deps);
			if (!active()) return;
			const deadline = Date.now() + flow.expiresInS * 1000;
			setState({
				phase: "awaiting_user",
				userCode: flow.userCode,
				verificationUri: flow.verificationUri,
			});
			await openUrl(flow.verificationUri);
			let interval = flow.intervalS * 1000;
			while (active()) {
				await waitForPoll(
					Math.min(interval, Math.max(0, deadline - Date.now())),
					controller.signal,
				);
				if (!active()) return;
				if (Date.now() >= deadline) {
					setState({ phase: "failed", reason: "expired" });
					return;
				}
				const result = await pollDeviceToken(deps, flow.deviceCode);
				if (result.status === "granted") {
					if (!active()) {
						await revoke(result.tokens.accessToken);
						return;
					}
					let validation: Awaited<ReturnType<typeof validateToken>>;
					try {
						validation = await validateToken(deps, result.tokens.accessToken);
					} catch {
						await revoke(result.tokens.accessToken);
						throw new Error("Twitch validation failed");
					}
					if (!active()) {
						await revoke(result.tokens.accessToken);
						return;
					}
					if (validation.status !== "valid" || !hasRequiredScopes(validation)) {
						setState({ phase: "failed", reason: "wrong_scopes" });
						await revoke(result.tokens.accessToken);
						return;
					}
					const connectedAuth = {
						...result.tokens,
						userId: validation.userId,
						login: validation.login,
						scopes: validation.scopes,
					};
					const saved = await saveTwitchAuth(connectedAuth, undefined, controller.signal);
					if (!saved || !active()) {
						if (saved) await clearTwitchAuth(connectedAuth);
						await revoke(result.tokens.accessToken);
					}
					if (active()) setState({ phase: "idle" });
					return;
				}
				if (!active()) return;
				if (result.status === "slow_down") interval += 5000;
				else if (result.status === "denied" || result.status === "expired") {
					setState({ phase: "failed", reason: result.status });
					return;
				}
			}
		} catch {
			if (active()) setState({ phase: "failed", reason: "network" });
		} finally {
			if (operation.current === controller) operation.current = null;
		}
	}, []);
	const disconnect = useCallback(async () => {
		if (!mounted.current || disconnecting) return;
		cancel();
		setDisconnecting(true);
		try {
			const current = await loadTwitchAuth();
			// Invalidate locally first: an in-flight refresh must not resurrect this account.
			if (current) await clearTwitchAuth(current);
			if (current)
				await revokeToken({ fetch, clientId: TWITCH_CLIENT_ID }, current.accessToken).catch(
					() => {},
				);
		} catch {
			if (mounted.current) toast.error(t("toast.settingsError"));
		} finally {
			if (mounted.current) setDisconnecting(false);
		}
	}, [cancel, disconnecting, t]);
	return {
		// Components receive public account metadata only, never either token.
		account: auth ? { login: auth.login, userId: auth.userId } : null,
		loading,
		state,
		connect,
		cancel,
		disconnect,
		disconnecting,
	};
}
