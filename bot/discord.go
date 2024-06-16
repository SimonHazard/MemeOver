package main

import (
	"flag"
	"log"
	"strings"

	"github.com/bwmarrin/discordgo"
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
	}

	commandHandlers = map[string]func(s *discordgo.Session, i *discordgo.InteractionCreate){
		"join": func(s *discordgo.Session, i *discordgo.InteractionCreate) {
			// Retrieve the option value
			options := i.ApplicationCommandData().Options

			if len(options) > 0 {
				code := options[0].StringValue()
				guildID := i.GuildID

				// Check if the code exists in the unpaired connections
				if _, exists := websocketConnectionsWithKey[code]; exists {
					usersByGuildId[guildID] = append(usersByGuildId[guildID], code)
					// Respond with a success message
					s.InteractionRespond(i.Interaction, &discordgo.InteractionResponse{
						Type: discordgo.InteractionResponseChannelMessageWithSource,
						Data: &discordgo.InteractionResponseData{
							Content: "You have successfully joined the session!",
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
	}
)

func initDiscord(botToken, applicationId string) *discordgo.Session {
	discord, err := discordgo.New("Bot " + botToken)
	checkNilErr(err, "discord init error:")

	discord.AddHandler(messageCreate)
	discord.AddHandler(interactionCreate)

	err = discord.Open()
	checkNilErr(err, "discord open error:")

	registerCommands(discord, applicationId)

	return discord
}

// Register all slash commands
func registerCommands(discord *discordgo.Session, applicationId string) {
	registeredCommands := make([]*discordgo.ApplicationCommand, len(commands))
	for i, v := range commands {
		cmd, err := discord.ApplicationCommandCreate(applicationId, "", v)
		checkNilErr(err, "Cannot create '"+v.Name+"' command:")
		registeredCommands[i] = cmd
	}
}

// Clean up commands Discord on destroy
func cleanupCommands(discord *discordgo.Session, applicationId string) {
	if *RemoveCommands {
		log.Println("Removing commands...")
		for _, v := range commands {
			err := discord.ApplicationCommandDelete(applicationId, "", v.ID)
			checkNilErr(err, "Cannot delete '"+v.Name+"' command:")
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

	guildID := message.GuildID

	// Check if there are paired connections for this guild
	if connections, exists := usersByGuildId[guildID]; exists {
		var imageUrls []string
		var videoUrls []string

		for _, attachments := range message.Attachments {
			if strings.Contains(attachments.ContentType, "image") {
				imageUrls = append(imageUrls, attachments.URL)
			} else if strings.Contains(attachments.ContentType, "video") {
				videoUrls = append(videoUrls, attachments.URL)
			}
		}

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

		// Send the message to each user in the paired connections
		for _, connection := range connections {
			sendMessageToWebSocket(connection, messageToSend)
		}
	}
}
