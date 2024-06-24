import { useEffect, useState } from "react";

const URL = "ws://localhost:8080/ws";

type Message = {
	text?: string | null;
	url?: string | null;
	isAnimated?: boolean | null;
	code?: string;
};

const App = () => {
	const [message, setMessage] = useState<Message>();
	const [code, setCode] = useState<string>();
	let timeoutId: NodeJS.Timeout;

	// biome-ignore lint/correctness/useExhaustiveDependencies: NodeJS.Timeout
	useEffect(() => {
		let socket: WebSocket;

		function createWebSocketConnection() {
			socket = new WebSocket(URL);

			socket.onmessage = (event) => {
				const data: Message = JSON.parse(event.data);
				setMessage(data);
				setCode("");

				let timeout = data.isAnimated ? 10000 : 5000;

				if (timeoutId) {
					clearTimeout(timeoutId);
				}

				if (data.code) {
					setCode(data.code);
					timeout = 30000;
				}

				timeoutId = setTimeout(() => {
					setMessage(undefined);
					setCode("");
				}, timeout);
			};

			socket.onclose = (event) => {
				console.log("WebSocket closed: ", event);
			};

			socket.onerror = (error) => {
				console.log("WebSocket error: ", error);
				socket.close();
			};
		}

		// Initialize the first connection
		createWebSocketConnection();

		return () => {
			if (socket) {
				socket.close();
			}

			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, []);

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
