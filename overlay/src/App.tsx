import { useEffect, useRef, useState } from "react";
import useWebSocket from "react-use-websocket";

const URL = import.meta.env.PROD
	? "ws://bot.simonhazard.com/ws"
	: "ws://localhost:8080/ws";

type Message = {
	text?: string | null;
	url?: string | null;
	isAnimated?: boolean | null;
	code?: string;
	isConnected?: boolean | null;
};

const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 30000;
const RECONNECT_RETRIES = 5;
const RECONNECT_INTERVAL = 5;

const App = () => {
	const [message, setMessage] = useState<Message>();
	const [code, setCode] = useState<string>();
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const { lastJsonMessage } = useWebSocket(URL, {
		heartbeat: {
			message: "ping",
			returnMessage: "pong",
			timeout: HEARTBEAT_TIMEOUT,
			interval: HEARTBEAT_INTERVAL,
		},
		reconnectAttempts: RECONNECT_RETRIES,
		reconnectInterval: RECONNECT_INTERVAL,
		shouldReconnect: () => true,
	});

	useEffect(() => {
		if (lastJsonMessage !== null) {
			const data: Message | undefined = lastJsonMessage;

			if (!data) {
				return;
			}

			if (data.code) {
				setCode(data.code);
				return;
			}

			setMessage(data);
			setCode("");

			const timeout = data.isAnimated ? 10000 : 5000;

			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			timeoutRef.current = setTimeout(() => {
				setMessage(undefined);
			}, timeout);
		}
	}, [lastJsonMessage]);

	return (
		<div className="h-full w-full p-2 flex justify-center items-center flex-col space-y-4 text-white text-stroke">
			<div className="relative h-full w-full">
				{message?.url && !message?.isAnimated ? (
					<img src={message.url} alt={message.url} className="w-full h-full" />
				) : null}
				{message?.url && message?.isAnimated ? (
					<video
						key={message.url}
						src={message.url}
						controls={false}
						autoPlay
						className="w-full h-full"
					>
						<track kind="captions" />
					</video>
				) : null}
				{message?.text ? (
					<p className="absolute bottom-0 w-full text-center p-2 text-6xl whitespace-normal break-words">
						{message.text}
					</p>
				) : null}
				{code ? (
					<div className=" text-8xl h-full flex justify-center items-center tracking-widest">
						<p>{code}</p>
					</div>
				) : null}
			</div>
		</div>
	);
};

export default App;
