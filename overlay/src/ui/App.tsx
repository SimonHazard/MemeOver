import React, { useEffect, useState } from "react";

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

	useEffect(() => {
		let socket: WebSocket;

		function createWebSocketConnection() {
			socket = new WebSocket(URL);

			socket.onmessage = (event) => {
				const data: Message = JSON.parse(event.data);
				setMessage(data);
				setCode("");

				if (data.code) {
					setCode(data.code);
				}
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
		};
	}, []);

	return (
		<div className="h-full w-full p-2 flex mx-auto justify-center items-center flex-col space-y-4">
			<div id="flex justify-center items-center flex-col">
				{message?.text ? <p className="text-center">{message.text}</p> : null}
				{message?.url && !message?.isAnimated ? (
					<img src={message.url} alt={message.url} />
				) : null}
				{message?.url && message?.isAnimated ? (
					<video key={message.url} src={message.url} controls={false} autoPlay>
						<track kind="captions" />
					</video>
				) : null}
			</div>
			{code ? (
				<div className="text-black text-2xl flex justify-center items-center">
					<p>{code}</p>
				</div>
			) : null}
		</div>
	);
};

export default App;
