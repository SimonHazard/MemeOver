package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Print("env error:", err)
	}

	botToken := os.Getenv("BOT_TOKEN")
	applicationId := os.Getenv("APPLICATION_ID")

	if botToken == "" {
		log.Fatal("BOT_TOKEN environment variable not set")
	}
	if applicationId == "" {
		log.Fatal("APPLICATION_ID environment variable not set")
	}

	discord := initDiscord(botToken, applicationId)
	defer discord.Close()

	http.HandleFunc("/ws", handleConnections)
	log.Println("http server started on :8080")
	err = http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("env error:", err)
		return
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	<-stop

	cleanupCommands(discord, applicationId)
	log.Println("http server shutting down")
}
