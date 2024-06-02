package main

import (
	"log"
	"os"
	"bot/bot"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load("local.env")
	if err != nil {
		log.Fatal("Error")
	}
	botToken := os.Getenv("BOT_TOKEN")
	bot.BotToken = botToken
	bot.Run()
}