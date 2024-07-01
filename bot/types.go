package main

type Message struct {
	Text       string `json:"text"`
	URL        string `json:"url"`
	IsAnimated bool   `json:"isAnimated"`
	IsAudio    bool   `json:"isAudio"`
}

type MessageCode struct {
	Code string `json:"code"`
}

type MessageConnected struct {
	IsConnected bool `json:"isConnected"`
}
