import "./index.css";
import "./ui";

// Move to ./ui
const socket = new WebSocket("ws://localhost:8080/ws");

type Message = {
  text: string | null;
  image_urls: string[] | null;
  video_urls: string[] | null;
  code?: string;
};

socket.onmessage = function (event) {
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

  data.image_urls?.forEach((url: string) => {
    const imgElement = document.createElement("img");
    imgElement.src = url;
    imgElement.style.width = "300px";
    messageDiv.appendChild(imgElement);
  });

  data.video_urls?.forEach((url: string) => {
    const videoElement = document.createElement("video");
    videoElement.src = url;
    videoElement.controls = false;
    videoElement.style.width = "300px";
    videoElement.autoplay = true;
    messageDiv.appendChild(videoElement);
  });

  document.getElementById("messages").appendChild(messageDiv);
  document.getElementById("messageCode").appendChild(messageDivCode);

  // Remove the messageDiv after 5 seconds
  setTimeout(() => {
    messageDiv.remove();
  }, 5000);
};

socket.onclose = function (event) {
  console.log("WebSocket closed: ", event);
};

socket.onerror = function (error) {
  console.log("WebSocket error: ", error);
};
