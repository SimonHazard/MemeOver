package main

import (
	"log"
	"net/http"
	"os"
	"os/signal"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load("local.env")
	checkNilErr(err, "env error:")

	botToken := os.Getenv("BOT_TOKEN")
	applicationId := os.Getenv("APPLICATION_ID")

	discord := initDiscord(botToken, applicationId)
	defer discord.Close()

	http.HandleFunc("/ws", handleConnections)
	log.Println("http server started on :8080")
	err = http.ListenAndServe(":8080", nil)
	checkNilErr(err, "listen and serve error")

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	<-stop

	cleanupCommands(discord, applicationId)
	log.Println("http server shutting down")
}
