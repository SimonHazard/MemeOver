import { useEffect, useRef, useState } from "react";
import useWebSocket from "react-use-websocket";
import {
	HEARTBEAT_INTERVAL,
	HEARTBEAT_TIMEOUT,
	type Message,
	RECONNECT_INTERVAL,
	RECONNECT_RETRIES,
	WEBSOCKET_URL,
} from "./technical/websocket";

const App = () => {
	const [message, setMessage] = useState<Message>();
	const [code, setCode] = useState<string>();
	const timeoutRef = useRef<number | null>(null);

	const { lastJsonMessage } = useWebSocket(WEBSOCKET_URL, {
		heartbeat: {
			message: "ping",
			returnMessage: "pong",
			timeout: HEARTBEAT_TIMEOUT,
			interval: HEARTBEAT_INTERVAL,
		},
		reconnectAttempts: RECONNECT_RETRIES,
		reconnectInterval: RECONNECT_INTERVAL,
		shouldReconnect: () => true,
		onError(event) {
			console.error("WebSocket error", event);
		},
	});

	const handleMediaPlay = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		timeoutRef.current = setTimeout(() => {
			setMessage(undefined);
			setCode("");
		}, 10000);
	};

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

			if (data.isAnimated || data.isAudio) {
				return;
			}

			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			timeoutRef.current = setTimeout(() => {
				setMessage(undefined);
			}, 5000);
		}
	}, [lastJsonMessage]);

	return (
		<div className="h-full w-full p-2 flex justify-center items-center flex-col space-y-4 text-white text-stroke">
			<div className="relative h-full w-full">
				{message?.url && !message?.isAnimated && !message?.isAudio ? (
					<img src={message.url} alt={message.url} className="w-full h-full" />
				) : null}
				{message?.url && message?.isAnimated ? (
					<video
						key={message.url}
						src={message.url}
						controls={false}
						autoPlay
						className="w-full h-full"
						onPlay={handleMediaPlay}
					>
						<track kind="captions" />
					</video>
				) : null}
				{message?.url && message?.isAudio ? (
					<audio
						key={message.url}
						src={message.url}
						controls={false}
						autoPlay
						className="hidden"
						onPlay={handleMediaPlay}
					>
						<track kind="captions" />
					</audio>
				) : null}
				{message?.text ? (
					<p className="absolute bottom-0 w-full text-center p-2 text-6xl whitespace-normal break-words">
						{message.text}
					</p>
				) : null}
				{code ? (
					<div className="h-full flex flex-col text-center justify-center items-center tracking-widest">
						<p className="text-3xl">
							To start using the application, please enter the following code in
							the /join command of the MemeOver bot
						</p>
						<p className="text-8xl ">{code}</p>
					</div>
				) : null}
			</div>
		</div>
	);
};

export default App;
