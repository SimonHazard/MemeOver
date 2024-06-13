package main

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/websocket"
)

var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Temporary map to store websocket connection unpaired
var websocketConnectionsUnpaired = make(map[string]*websocket.Conn)

// var websocketConnectionsPaired = make(map[string][]string)

// Handle the connection to the websocket
func handleConnections(w http.ResponseWriter, r *http.Request) {
	websocketConnection, err := wsUpgrader.Upgrade(w, r, nil)
	checkNilErr(err, "ws connection:")

	// TODO Create a unique ID
	// TODO When websocket close, remove the ID of the user disconnected
	websocketConnectionsUnpaired["a"] = websocketConnection

	messageToSend := MessageUnpaired{
		Code: "a",
	}

	messageJSON, err := json.Marshal(messageToSend)
	checkNilErr(err, "marshal message:")

	websocketConnection.WriteMessage(websocket.TextMessage, messageJSON)
}

// TODO Filter by GuildID
// Send JSON message to our websocket
func sendMessageToWebSocket(message Message) {
	for _, websocketConnection := range websocketConnectionsUnpaired {
		if websocketConnection != nil {
			messageJSON, err := json.Marshal(message)
			checkNilErr(err, "marshal message:")

			err = websocketConnection.WriteMessage(websocket.TextMessage, messageJSON)
			checkNilErr(err, "write message:")
		}
	}
}
