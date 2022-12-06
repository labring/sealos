package main

import (
	"flag"
	"math/rand"
	"net"
	"net/http"
	"time"

	"github.com/cesanta/glog"
	"github.com/labring/service/hub/server"
)

type RestartableServer struct {
	configFile string
	authServer *server.AuthServer
	hs         *http.Server
}

func ServeOnce(c *server.Config, cf string) (*server.AuthServer, *http.Server) {
	as, err := server.NewAuthServer(c)
	if err != nil {
		glog.Exitf("Failed to create auth server: %s", err)
	}
	hs := &http.Server{
		Addr:    c.Server.ListenAddress,
		Handler: as,
	}
	var listener net.Listener
	listener, err = net.Listen("tcp", c.Server.ListenAddress)
	if err != nil {
		glog.Fatal(err.Error())
	}
	go func() {
		if err := hs.Serve(listener); err != nil {
			if err == http.ErrServerClosed {
				return
			}
		}
	}()
	glog.Infof("Serving on %s", c.Server.ListenAddress)
	return as, hs
}

func (rs *RestartableServer) Serve(c *server.Config) {
	rs.authServer, rs.hs = ServeOnce(c, rs.configFile)
}

func main() {
	flag.Parse()
	rand.Seed(time.Now().UnixNano())
	glog.CopyStandardLogTo("INFO")

	cf := flag.Arg(0)
	if cf == "" {
		glog.Exitf("Config file not specified")
	}
	config, err := server.LoadConfig(cf)
	if err != nil {
		glog.Exitf("Failed to load config: %s", err)
	}
	rs := RestartableServer{
		configFile: cf,
	}
	rs.Serve(config)
}
