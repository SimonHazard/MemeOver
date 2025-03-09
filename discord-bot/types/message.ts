interface MemeMessage {
	text: string;
	url: string;
	isAnimated: boolean;
	isAudio: boolean;
}

interface MessageCode {
	code: string;
}

interface MessageConnected {
	isConnected: boolean;
}

export type { MemeMessage, MessageCode, MessageConnected };
