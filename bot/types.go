package main

type Message struct {
	Text       string `json:"text"`
	URL        string `json:"url"`
	IsAnimated bool   `json:"isAnimated"`
}

type MessageCode struct {
	Code string `json:"code"`
}
