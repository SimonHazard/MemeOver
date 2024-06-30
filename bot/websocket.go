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

	go handleMessages(websocketConnection)
}

func handleMessages(conn *websocket.Conn) {
	defer func() {
		log.Println("Close connection")
		conn.Close()
		for key, connection := range websocketConnectionsWithKey {
			log.Println("Closed key", key)
			if connection == conn {
				delete(websocketConnectionsWithKey, key)
				removeFromUsersByGuildId(key)
				break
			}
		}
	}()

	for {
		messageType, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("Ping read:", err)
			break
		}

		if messageType == websocket.TextMessage {
			if string(message) == "ping" {
				err = conn.WriteMessage(websocket.TextMessage, []byte("pong"))
				if err != nil {
					log.Println("Write pong error:", err)
					break
				}
				continue
			}

			var data map[string]interface{}
			err = json.Unmarshal(message, &data)
			if err != nil {
				log.Println("Unmarshal error:", err)
				continue
			}
		}
	}
}

func removeFromUsersByGuildId(connectionKey string) {
	for guildID, connections := range usersByGuildId {
		for i, key := range connections {
			if key == connectionKey {
				usersByGuildId[guildID] = append(connections[:i], connections[i+1:]...)
				break
			}
		}
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
