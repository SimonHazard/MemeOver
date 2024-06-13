package main

type Message struct {
	Text      string   `json:"text"`
	ImageURLs []string `json:"image_urls"`
	VideoURLs []string `json:"video_urls"`
}

type MessageUnpaired struct {
	Code string `json:"code"`
}
