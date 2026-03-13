package server

import (
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/labring/sealos/service/pkg/server"
)

type MinioServer struct {
	ConfigFile string
}

func (rs *MinioServer) Serve(c *server.Config) {
	ps, err := server.NewPromServer(c)
	if err != nil {
		fmt.Printf("Failed to create auth server: %s\n", err)
		return
	}

	hs := &http.Server{
		Addr:              c.Server.ListenAddress,
		Handler:           ps,
		ReadHeaderTimeout: 10 * time.Second,
	}

	listener, err := net.Listen("tcp", c.Server.ListenAddress)
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Printf("Serve on %s\n", c.Server.ListenAddress)

	if err := hs.Serve(listener); err != nil {
		fmt.Println(err)
		return
	}
}
