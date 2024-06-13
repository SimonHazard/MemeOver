package main

import "log"

func checkNilErr(err error, message string) {
	if err != nil {
		log.Fatal(message, err)
	}
}
