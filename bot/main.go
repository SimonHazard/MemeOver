package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/bwmarrin/discordgo"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Message struct {
	Text      string   `json:"text"`
	ImageURLs []string `json:"image_urls"`
	VideoURLs []string `json:"video_urls"`
}

var websocketConnection *websocket.Conn

// var (
// 	Token = flag.String("token", os.Getenv("BOT_TOKEN"), "Bot authentication token")
// 	App   = flag.String("app", os.Getenv("APPLICATION_ID"), "Application ID")
// 	Guild = flag.String("guild", os.Getenv("GUILD_ID"), "Guild ID")
// )

// Handle error
func checkNilErr(err error, message string) {
	if err != nil {
		log.Fatal(message, err)
	}
}

func main() {
	err := godotenv.Load("local.env")
	checkNilErr(err, "env error:")

	botToken := os.Getenv("BOT_TOKEN")

	discord, discordErr := discordgo.New("Bot " + botToken)
	checkNilErr(discordErr, "discord init error:")

	discord.AddHandler(messageCreate)

	err = discord.Open()
	checkNilErr(err, "discord open error:")

	defer discord.Close()

	http.HandleFunc("/ws", handleConnections)

	log.Println("http server started on :8080")

	err = http.ListenAndServe(":8080", nil)
	checkNilErr(err, "listen and server error")
}

// Create the message to send through the websocket
func messageCreate(discord *discordgo.Session, message *discordgo.MessageCreate) {
	if message.Author.ID == discord.State.User.ID {
		return
	}

	var imageUrls []string
	var videoUrls []string

	// Check for attachments (video or image)
	for _, attachments := range message.Attachments {
		if strings.Contains(attachments.ContentType, "image") {
			imageUrls = append(imageUrls, attachments.URL)
		} else if strings.Contains(attachments.ContentType, "video") {
			videoUrls = append(videoUrls, attachments.URL)
		}
	}

	// Check for embed (video or image)
	for _, embed := range message.Embeds {
		if embed.Type == "image" {
			imageUrls = append(imageUrls, embed.URL)
		} else if embed.Type == "video" {
			videoUrls = append(videoUrls, embed.URL)
		}
	}

	messageToSend := Message{
		Text:      message.Content,
		ImageURLs: imageUrls,
		VideoURLs: videoUrls,
	}

	sendMessageToWebSocket(messageToSend)
}

// Handle the connection of the websocket
func handleConnections(w http.ResponseWriter, r *http.Request) {
	var err error

	websocketConnection, err = wsUpgrader.Upgrade(w, r, nil)

	checkNilErr(err, "ws connection:")

	defer websocketConnection.Close()

	for {
		_, _, err := websocketConnection.ReadMessage()
		if err != nil {
			log.Println("read:", err)
			break
		}
	}
}

// Send JSON message to our websocket
func sendMessageToWebSocket(message Message) {
	log.Println("message", message)
	if websocketConnection != nil {
		messageJSON, err := json.Marshal(message)

		if err != nil {
			log.Println("error marshaling message:", err)
			return
		}

		err = websocketConnection.WriteMessage(websocket.TextMessage, messageJSON)

		if err != nil {
			log.Println("write:", err)
		}
	}
}
