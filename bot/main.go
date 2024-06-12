package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"

	"github.com/bwmarrin/discordgo"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

type Message struct {
	Text      string   `json:"text"`
	ImageURLs []string `json:"image_urls"`
	VideoURLs []string `json:"video_urls"`
}

type MessageUnpaired struct {
	Code string `json:"code"`
}

// Websocket parameters
var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Bot parameters
var (
	RemoveCommands = flag.Bool("rmcmd", true, "Remove all commands after shutdowning or not")
)

// Temporary map to store websocket connection unpaired
var websocketConnectionsUnpaired = make(map[string]*websocket.Conn)

// var websocketConnectionsPaired = make(map[string][]string)

var (
	dmPermission = false
	commands     = []*discordgo.ApplicationCommand{
		{
			Name:         "join",
			Description:  "This command permits to join a MemeOver session",
			DMPermission: &dmPermission,
		},
		{
			Name:         "hello",
			Description:  "say hello to the bot",
			DMPermission: &dmPermission,
		}}

	commandHandlers = map[string]func(s *discordgo.Session, i *discordgo.InteractionCreate){
		"join": func(s *discordgo.Session, i *discordgo.InteractionCreate) {
			s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
				Type: discordgo.InteractionResponseChannelMessageWithSource,
				Data: &discordgo.InteractionResponseData{
					Content: "Hey there! Congratulations, you just executed your first slash command",
				},
			})
		},
		"hello": func(s *discordgo.Session, i *discordgo.InteractionCreate) {
			s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
				Type: discordgo.InteractionResponseChannelMessageWithSource,
				Data: &discordgo.InteractionResponseData{
					Content: "Hey there! Congratulations, you just executed your first slash command",
				},
			})
		},
	}
)

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
	applicationId := os.Getenv("APPLICATION_ID")

	discord, discordErr := discordgo.New("Bot " + botToken)
	checkNilErr(discordErr, "discord init error:")

	discord.AddHandler(messageCreate)

	discord.AddHandler(interactionCreate)

	err = discord.Open()
	checkNilErr(err, "discord open error:")

	registeredCommands := make([]*discordgo.ApplicationCommand, len(commands))
	for i, v := range commands {
		cmd, err := discord.ApplicationCommandCreate(applicationId, "", v)
		if err != nil {
			log.Panicf("Cannot create '%v' command: %v", v.Name, err)
		}
		registeredCommands[i] = cmd
	}

	defer discord.Close()

	http.HandleFunc("/ws", handleConnections)

	log.Println("http server started on :8080")

	err = http.ListenAndServe(":8080", nil)
	checkNilErr(err, "listen and server error")

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	log.Println("Press Ctrl+C to exit")
	<-stop

	if *RemoveCommands {
		log.Println("Removing commands...")
		for _, v := range registeredCommands {
			err := discord.ApplicationCommandDelete(applicationId, "", v.ID)
			if err != nil {
				log.Panicf("Cannot delete '%v' command: %v", v.Name, err)
			}
		}
	}

	log.Println("Gracefully shutting down.")
}

func interactionCreate(s *discordgo.Session, i *discordgo.InteractionCreate) {
	if i.Type != discordgo.InteractionApplicationCommand {
		return
	}

	if h, ok := commandHandlers[i.ApplicationCommandData().Name]; ok {
		h(s, i)
	}
}

// Handle only server messages
// Create the message to send through the websocket
func messageCreate(discord *discordgo.Session, message *discordgo.MessageCreate) {
	if message.Author.ID == discord.State.User.ID {
		return
	}

	log.Print("message", message.GuildID)
	log.Print("discord", discord)

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
	var websocketConnection *websocket.Conn

	websocketConnection, err = wsUpgrader.Upgrade(w, r, nil)

	checkNilErr(err, "ws connection:")

	// TODO Create a unique ID
	// TODO When websocket close, remove the ID of the user disconnected
	websocketConnectionsUnpaired["a"] = websocketConnection

	messageToSend := MessageUnpaired{
		Code: "a",
	}

	messageJSON, err := json.Marshal(messageToSend)

	if err != nil {
		log.Println("error marshaling message:", err)
		return
	}

	websocketConnection.WriteMessage(websocket.TextMessage, messageJSON)
}

// TODO Filter by GuildID
// Send JSON message to our websocket
func sendMessageToWebSocket(message Message) {
	log.Println("message", message)

	for _, websocketConnection := range websocketConnectionsUnpaired {
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

}
