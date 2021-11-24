package main

import (
	"flag"
	"fmt"
	"log"

	"github.com/s4y/constructor"
)

func main() {
	server := constructor.Server{}
	flag.StringVar(&server.StaticDir, "static", "./static", "Directory for static content")
	flag.StringVar(&server.HTTPAddr, "http", "127.0.0.1:8080", "Listening address")
	flag.Parse()
	fmt.Printf("http://%s/\n", server.HTTPAddr)

	log.Fatal(server.Serve())
}
