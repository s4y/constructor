package main

import (
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"

	"github.com/s4y/reserve"
)

func main() {
	staticDir := flag.String("static", "./static", "Directory for static content")
	httpAddr := flag.String("http", "127.0.0.1:8080", "Listening address")
	flag.Parse()
	fmt.Printf("http://%s/\n", *httpAddr)

	ln, err := net.Listen("tcp", *httpAddr)
	if err != nil {
		log.Fatal(err)
	}

	http.Handle("/", reserve.FileServer(http.Dir(*staticDir)))
	log.Fatal(http.Serve(ln, nil))
}
