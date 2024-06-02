package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

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

func main() {
	err := godotenv.Load("local.env")
	if err != nil {
		log.Fatal("Error")
	}
	botToken := os.Getenv("BOT_TOKEN")
	// bot.BotToken = botToken
	// bot.Run()

	dg, err := discordgo.New("Bot " + botToken)

	dg.AddHandler(messageCreate)

	err = dg.Open()
	if err != nil {
		fmt.Println("error opening connection,", err)
		return
	}
	defer dg.Close()

	http.HandleFunc("/ws", handleConnections)
	log.Println("http server started on :8080")
	err = http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}

func messageCreate(s *discordgo.Session, m *discordgo.MessageCreate) {
	log.Println("message", m.Attachments)
	if m.Author.ID == s.State.User.ID {
		return
	}

	for _, attachments := range m.Attachments {
		if attachments.ContentType == "image" {
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
	log.Println(message)
	if wsConn != nil {
		err := wsConn.WriteMessage(websocket.TextMessage, []byte(message))
		if err != nil {
			log.Println("write:", err)
		}
	}
}
