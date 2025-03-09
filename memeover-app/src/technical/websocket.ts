const WEBSOCKET_URL = import.meta.env.PROD
	? "ws://bot.simonhazard.com:2082/ws"
	: "ws://localhost:3000/ws";

type Message = {
	text?: string | null;
	url?: string | null;
	isAnimated?: boolean | null;
	isAudio?: boolean | null;
	code?: string;
	isConnected?: boolean | null;
};

const HEARTBEAT_INTERVAL = 5000;
const HEARTBEAT_TIMEOUT = 60000;
const RECONNECT_RETRIES = 5;
const RECONNECT_INTERVAL = 5;

export {
	WEBSOCKET_URL,
	HEARTBEAT_INTERVAL,
	HEARTBEAT_TIMEOUT,
	RECONNECT_INTERVAL,
	RECONNECT_RETRIES,
};
export type { Message };
