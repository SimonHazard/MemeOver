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

// Map to store websocket connections with a generated key
var websocketConnectionsWithKey = make(map[string]*websocket.Conn)

// Map to store users by guild id
var usersByGuildId = make(map[string][]string)

// Handle the connection of the websocket
func handleConnections(w http.ResponseWriter, r *http.Request) {
	websocketConnection, err := wsUpgrader.Upgrade(w, r, nil)
	checkNilErr(err, "ws connection:")

	uniqueID := getUniqueID()
	websocketConnectionsWithKey[uniqueID] = websocketConnection

	messageToSend := MessageCode{
		Code: uniqueID,
	}

	messageJSON, err := json.Marshal(messageToSend)
	checkNilErr(err, "error marshaling message:")

	err = websocketConnection.WriteMessage(websocket.TextMessage, messageJSON)
	checkNilErr(err, "write:")
}

// Send JSON message to our websocket
func sendMessageToWebSocket(connection string, message Message) {
	websocketConnection := websocketConnectionsWithKey[connection]
	if websocketConnection != nil {
		messageJSON, err := json.Marshal(message)
		checkNilErr(err, "marshal message:")
		err = websocketConnection.WriteMessage(websocket.TextMessage, messageJSON)
		checkNilErr(err, "write message:")
	}

}
