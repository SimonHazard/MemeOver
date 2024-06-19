import "./index.css";

const socket = new WebSocket("ws://localhost:8080/ws");

type Message = {
	text: string | null;
	image_urls: string[] | null;
	video_urls: string[] | null;
	code?: string;
};

socket.onmessage = (event) => {
	const data: Message = JSON.parse(event.data);

	const messageDiv = document.createElement("div");
	const messageDivCode = document.createElement("div");

	messageDiv.className = "message";
	messageDivCode.className = "messageCode";

	if (data.code) {
		const textElement = document.createElement("p");
		textElement.textContent = data.code;
		messageDivCode.appendChild(textElement);
	}

	if (data.text) {
		const textElement = document.createElement("p");
		textElement.textContent = data.text;
		messageDiv.appendChild(textElement);
	}

	if (data.image_urls) {
		for (const url of data.image_urls) {
			const imgElement = document.createElement("img");
			imgElement.src = url;
			imgElement.style.width = "300px";
			messageDiv.appendChild(imgElement);
		}
	}

	if (data.video_urls) {
		for (const url of data.video_urls) {
			const videoElement = document.createElement("video");
			videoElement.src = url;
			videoElement.controls = false;
			videoElement.style.width = "300px";
			videoElement.autoplay = true;
			messageDiv.appendChild(videoElement);
		}
	}

	document.getElementById("messages").appendChild(messageDiv);
	document.getElementById("messageCode").appendChild(messageDivCode);

	// Remove the messageDiv after 5 seconds
	setTimeout(() => {
		messageDiv.remove();
	}, 5000);
};

socket.onclose = (event) => {
	console.log("WebSocket closed: ", event);
};

socket.onerror = (error) => {
	console.log("WebSocket error: ", error);
};
