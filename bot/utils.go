package main

import (
	"math/rand"
	"time"
)

// Helper function to generate a unique ID easy to write for the user
func generateUniqueID() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const length = 6
	var seededRand = rand.New(rand.NewSource(time.Now().UnixNano()))

	b := make([]byte, length)
	for i := range b {
		b[i] = charset[seededRand.Intn(len(charset))]
	}
	return string(b)
}

// Ensure ID is unique
func getUniqueID() string {
	for {
		id := generateUniqueID()
		if _, exists := websocketConnectionsWithKey[id]; !exists {
			return id
		}
	}
}
