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
		},
		{
			Name:         "hello",
			Description:  "say hello to the bot",
			DMPermission: &dmPermission,
		},
	}

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

func registerCommands(discord *discordgo.Session, applicationId string) {
	registeredCommands := make([]*discordgo.ApplicationCommand, len(commands))
	for i, v := range commands {
		cmd, err := discord.ApplicationCommandCreate(applicationId, "", v)
		checkNilErr(err, "Cannot create '"+v.Name+"' command:")
		registeredCommands[i] = cmd
	}
}

func cleanupCommands(discord *discordgo.Session, applicationId string) {
	if *RemoveCommands {
		log.Println("Removing commands...")
		for _, v := range commands {
			err := discord.ApplicationCommandDelete(applicationId, "", v.ID)
			checkNilErr(err, "Cannot delete '"+v.Name+"' command:")
		}
	}
}

func interactionCreate(s *discordgo.Session, i *discordgo.InteractionCreate) {
	if i.Type != discordgo.InteractionApplicationCommand {
		return
	}

	if h, ok := commandHandlers[i.ApplicationCommandData().Name]; ok {
		h(s, i)
	}
}

func messageCreate(discord *discordgo.Session, message *discordgo.MessageCreate) {
	if message.Author.ID == discord.State.User.ID {
		return
	}

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

	sendMessageToWebSocket(messageToSend)
}
