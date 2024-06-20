package main

import (
	"encoding/json"
	"log"
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
	if err != nil {
		log.Println("ws connection:", err)
		return
	}

	uniqueID := getUniqueID()
	websocketConnectionsWithKey[uniqueID] = websocketConnection

	messageToSend := MessageCode{
		Code: uniqueID,
	}

	messageJSON, err := json.Marshal(messageToSend)
	if err != nil {
		log.Println("error marshaling message:", err)
		return
	}

	err = websocketConnection.WriteMessage(websocket.TextMessage, messageJSON)
	if err != nil {
		log.Println("Write error:", err)
		return
	}
}

// Send JSON message to our websocket
func sendMessageToWebSocket(connection string, message Message) {
	websocketConnection := websocketConnectionsWithKey[connection]
	if websocketConnection != nil {
		messageJSON, err := json.Marshal(message)
		if err != nil {
			log.Println("error marshaling message:", err)
			return
		}
		err = websocketConnection.WriteMessage(websocket.TextMessage, messageJSON)
		if err != nil {
			log.Println("Write error:", err)
			return
		}
	}

}
