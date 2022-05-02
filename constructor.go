package constructor

import (
	"fmt"
	"log"
	"net"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/s4y/reserve"
)

type Client struct {
	Id    uint        `json:"id"`
	State interface{} `json:"state"`
	queue chan func(*websocket.Conn)
}

func (c *Client) Close() {
	close(c.queue)
}

type Clients struct {
	nextId  uint
	clients map[uint]*Client
	queue   chan func()
}

func NewClients() Clients {
	queue := make(chan func())
	go func() {
		for f := range queue {
			f()
		}
	}()
	return Clients{
		nextId:  0,
		clients: make(map[uint]*Client),
		queue:   queue,
	}
}

func (cs *Clients) Create(conn *websocket.Conn) *Client {
	c := &Client{
		Id:    cs.nextId,
		State: make(map[string]interface{}),
		queue: make(chan func(*websocket.Conn)),
	}
	cs.nextId += 1
	go func() {
		for f := range c.queue {
			f(conn)
		}
		cs.queue <- func() {
			delete(cs.clients, c.Id)
		}
	}()
	cs.queue <- func() {
		c.queue <- func(conn *websocket.Conn) {
			for _, client := range cs.clients {
				conn.WriteJSON(Message{
					Name:  "update",
					Value: client,
				})
			}
		}
		for _, client := range cs.clients {
			client.queue <- func(conn *websocket.Conn) {
				conn.WriteJSON(Message{
					Name:  "update",
					Value: c,
				})
			}
		}
		cs.clients[c.Id] = c
	}
	return c
}

type Server struct {
	StaticDir string
	HTTPAddr  string
}

type Message struct {
	Name  string      `json:"name"`
	Value interface{} `json:"value"`
}

func (s *Server) Serve() error {
	ln, err := net.Listen("tcp", s.HTTPAddr)
	if err != nil {
		log.Fatal(err)
	}

	upgrader := websocket.Upgrader{}
	clients := NewClients()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()
		client := clients.Create(conn)
		defer client.Close()

		for {
			var msg Message
			if err := conn.ReadJSON(&msg); err != nil {
				break
			}
			fmt.Println("got", msg)
		}
	})
	http.Handle("/", reserve.FileServer(http.Dir(s.StaticDir)))
	return http.Serve(ln, nil)
}
