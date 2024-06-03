package main

import (
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

var wsConn *websocket.Conn

// var (
// 	Token = flag.String("token", os.Getenv("BOT_TOKEN"), "Bot authentication token")
// 	App   = flag.String("app", os.Getenv("APPLICATION_ID"), "Application ID")
// 	Guild = flag.String("guild", os.Getenv("GUILD_ID"), "Guild ID")
// )

// Handle error
func checkNilErr(e error, message string) {
	if e != nil {
		log.Fatal("Error message" + message)
	}
}

func main() {
	err := godotenv.Load("local.env")
	checkNilErr(err, "env error")

	botToken := os.Getenv("BOT_TOKEN")

	discord, discordErr := discordgo.New("Bot " + botToken)
	checkNilErr(discordErr, "discord init error")

	discord.AddHandler(messageCreate)

	err = discord.Open()
	checkNilErr(err, "discord open error")

	defer discord.Close()

	http.HandleFunc("/ws", handleConnections)

	log.Println("http server started on :8080")

	err = http.ListenAndServe(":8080", nil)
	checkNilErr(err, "listen and server error")
}

func messageCreate(discord *discordgo.Session, message *discordgo.MessageCreate) {
	if message.Author.ID == discord.State.User.ID {
		return
	}

	for _, attachments := range message.Attachments {
		if strings.Contains(attachments.ContentType, "image") {
			sendMessageToWebSocket(attachments.URL)
		}
	}
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	var err error
	wsConn, err = wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer wsConn.Close()

	for {
		_, _, err := wsConn.ReadMessage()
		if err != nil {
			log.Println("read:", err)
			break
		}
	}
}

func sendMessageToWebSocket(message string) {
	log.Println("message", message)
	if wsConn != nil {
		err := wsConn.WriteMessage(websocket.TextMessage, []byte(message))
		if err != nil {
			log.Println("write:", err)
		}
	}
}
