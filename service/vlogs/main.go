package main

import (
	"flag"
	"fmt"
	"github.com/labring/sealos/service/vlogs/config"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	vlogsServer "github.com/labring/sealos/service/vlogs/server"
)

type RestartableServer struct {
	configFile string
}

func (rs *RestartableServer) Serve(c *config.Config) {
	vs, err := vlogsServer.NewVLogsServer(c)
	if err != nil {
		fmt.Printf("Failed to create auth server: %s\n", err)
		return
	}

	hs := &http.Server{
		Addr:              c.Server.ListenAddress,
		Handler:           vs,
		ReadHeaderTimeout: 30 * time.Second,
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
	log.SetOutput(os.Stdout)
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	flag.Parse()

	cf := flag.Arg(0)
	if cf == "" {
		fmt.Println("Config file not sepcified")
		return
	}

	config, err := config.InitConfig(cf)
	if err != nil {
		fmt.Println(err)
		return
	}
	rs := RestartableServer{
		configFile: cf,
	}
	rs.Serve(config)
}
