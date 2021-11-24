package constructor

import (
	"log"
	"net"
	"net/http"

	"github.com/s4y/reserve"
)

type Server struct {
	StaticDir string
	HTTPAddr  string
}

func (s *Server) Serve() error {
	ln, err := net.Listen("tcp", s.HTTPAddr)
	if err != nil {
		log.Fatal(err)
	}

	http.Handle("/", reserve.FileServer(http.Dir(s.StaticDir)))
	return http.Serve(ln, nil)
}
