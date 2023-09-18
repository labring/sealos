package main

import (
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"

	"github.com/labring/sealos/service/database/server"
)

type RestartableServer struct {
	configFile string
	// server     *server.PromServer
	// hs         *http.Server
}

func (rs *RestartableServer) Serve(c *server.Config) {
	var ps, err = server.NewPromServer(c)
	if err != nil {
		fmt.Printf("Failed to create auth server: %s\n", err)
		return
	}

	hs := &http.Server{
		Addr:    c.Server.ListenAddress,
		Handler: ps,
	}

	var listener net.Listener
	listener, err = net.Listen("tcp", c.Server.ListenAddress)
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

func main() {
	log.SetOutput(os.Stdout) // 将日志输出定向到标准输出（stdout）
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	flag.Parse()

	cf := flag.Arg(0)
	if cf == "" {
		fmt.Println("Config file not sepcified")
		return
	}

	config, err := server.InitConfig(cf)
	if err != nil {
		fmt.Println(err)
		return
	}
	rs := RestartableServer{
		configFile: cf,
	}
	rs.Serve(config)
}
