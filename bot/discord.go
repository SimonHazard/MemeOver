package main

import (
	"encoding/json"
	"flag"
	"log"
	"regexp"
	"strings"

	"github.com/bwmarrin/discordgo"
	"github.com/gorilla/websocket"
)

var (
	RemoveCommands = flag.Bool("rmcmd", true, "Remove all commands after shutdowning or not")
	dmPermission   = false
	commands       = []*discordgo.ApplicationCommand{
		{
			Name:         "join",
			Description:  "This command permits to join a MemeOver session",
			DMPermission: &dmPermission,
			Options: []*discordgo.ApplicationCommandOption{
				{
					Type:        discordgo.ApplicationCommandOptionString,
					Name:        "id",
					Description: "Unique ID",
					Required:    true,
				},
			},
		},
		{
			Name: "help",
			Description: "How to use MemeOver?",
		},
	}

	commandHandlers = map[string]func(s *discordgo.Session, i *discordgo.InteractionCreate){
		"join": func(s *discordgo.Session, i *discordgo.InteractionCreate) {
			// Retrieve the option value
			options := i.ApplicationCommandData().Options

			if len(options) > 0 {
				code := options[0].StringValue()
				guildID := i.GuildID

				// Check if the code exists in the unpaired connections
				if conn, exists := websocketConnectionsWithKey[code]; exists {
					usersByGuildId[guildID] = append(usersByGuildId[guildID], code)
					
					// Send "isConnected" message to WebSocket
					messageToSend := MessageConnected{
						IsConnected: true,
					}

					messageJSON, err := json.Marshal(messageToSend)
					if err != nil {
						log.Println("error marshaling message:", err)
						return
					}

					err = conn.WriteMessage(websocket.TextMessage, messageJSON)
					if err != nil {
						log.Println("Write error:", err)
						return
					}

					// Respond with a success message
					s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
						Type: discordgo.InteractionResponseChannelMessageWithSource,
						Data: &discordgo.InteractionResponseData{
							Content: "You have successfully joined the session! You can now use `!send` command to send memes to your friends!",
						},
					})
				} else {
					// Respond with an error message
					s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
						Type: discordgo.InteractionResponseChannelMessageWithSource,
						Data: &discordgo.InteractionResponseData{
							Content: "Invalid code. Please check and try again.",
						},
					})
				}
			} else {
				// Handle case where no option was provided
				s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
					Type: discordgo.InteractionResponseChannelMessageWithSource,
					Data: &discordgo.InteractionResponseData{
						Content: "No code provided. Please try again.",
					},
				})
			}
		},
		"help": func(s *discordgo.Session, i *discordgo.InteractionCreate) {
			s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
				Type: discordgo.InteractionResponseChannelMessageWithSource,
				Data: &discordgo.InteractionResponseData{
					Content: "To join a session, you need to launch MemeOver app, then you'll have a code for the `/join` command. After that, `!send` in your message to send meme to your friends.",
				},
			})
		},
	}
)

func initDiscord(botToken, applicationId string) *discordgo.Session {
	discord, err := discordgo.New("Bot " + botToken)
	if err != nil {
		log.Fatal("discord init error:", err)
	}

	discord.AddHandler(messageCreate)
	discord.AddHandler(interactionCreate)

	err = discord.Open()
	if err != nil {
		log.Fatal("discord open error:", err)
	}

	registerCommands(discord, applicationId)

	return discord
}

// Register all slash commands
func registerCommands(discord *discordgo.Session, applicationId string) {
	registeredCommands := make([]*discordgo.ApplicationCommand, len(commands))
	for i, v := range commands {
		cmd, err := discord.ApplicationCommandCreate(applicationId, "", v)
		if err != nil {
			log.Printf("Cannot create '"+v.Name+"' command:", err)
			break
		}
		registeredCommands[i] = cmd
	}
}

// Clean up commands Discord on destroy
func cleanupCommands(discord *discordgo.Session, applicationId string) {
	if *RemoveCommands {
		log.Println("Removing commands...")
		for _, v := range commands {
			err := discord.ApplicationCommandDelete(applicationId, "", v.ID)
			if err != nil {
				log.Printf("Cannot delete '"+v.Name+"' command:", err)
				break
			}
		}
	}
}

// Event handlers to slash commands
func interactionCreate(s *discordgo.Session, i *discordgo.InteractionCreate) {
	if i.Type != discordgo.InteractionApplicationCommand {
		return
	}

	if h, ok := commandHandlers[i.ApplicationCommandData().Name]; ok {
		h(s, i)
	}
}

// Send message to users. ATM, we can't attach files to a slash command
func messageCreate(discord *discordgo.Session, message *discordgo.MessageCreate) {
	if message.Author.ID == discord.State.User.ID {
		return
	}

	if !strings.HasPrefix(message.Content, "!send") {
		return
	}

	guildID := message.GuildID

	// Check if there are paired connections for this guild
	if connections, exists := usersByGuildId[guildID]; exists {
		var url string
		var isAnimated bool
		var isAudio bool

		for _, attachments := range message.Attachments {
			if strings.Contains(attachments.ContentType, "image") {
				url = attachments.URL
				isAnimated = false
				isAudio = false
			} else if strings.Contains(attachments.ContentType, "video") {
				url = attachments.URL
				isAnimated = true
				isAudio = false
			} else if strings.Contains(attachments.ContentType, "audio") {
				url = attachments.URL
				isAnimated = false
				isAudio = true
			}
		}

		for _, embed := range message.Embeds {
			if embed.Type == "image" {
				url = embed.URL
				isAnimated = false
				isAudio = false
			} else if embed.Type == "video" {
				url = embed.URL
				isAnimated = true
				isAudio = false
			}
		}

		content := message.Content
		content = strings.TrimSpace(strings.TrimPrefix(content, "!send"))
		
		// Remove links from the content
		re := regexp.MustCompile(`https?://[^\s]+`)
		content = re.ReplaceAllString(content, "")

		messageToSend := Message{
			Text:       content,
			URL:        url,
			IsAnimated: isAnimated,
			IsAudio: isAudio,
		}

		// Send the message to each user in the paired connections
		for _, connection := range connections {
			sendMessageToWebSocket(connection, messageToSend)
		}
	}
}
