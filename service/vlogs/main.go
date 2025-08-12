package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	vlogsServer "github.com/labring/sealos/service/vlogs/server"
)

type RestartableServer struct {
	configFile string
}

func (rs *RestartableServer) Serve(c *vlogsServer.Config) {
	vs, err := vlogsServer.NewVLogsServer(c)
	if err != nil {
		fmt.Printf("Failed to create auth server: %s\n", err)
		return
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	hs := &http.Server{
		Addr:              c.Server.ListenAddress,
		Handler:           vs,
		ReadHeaderTimeout: 30 * time.Second,
	}

	fmt.Printf("Serve on %s\n", c.Server.ListenAddress)
	go func() {
		if err := hs.ListenAndServe(); err != nil {
			fmt.Println(err)
			return
		}
	}()

	<-ctx.Done()

	shutdownSrvCtx, shutdownSrvCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownSrvCancel()

	if err := hs.Shutdown(shutdownSrvCtx); err != nil {
		fmt.Println("server forced to shutdown: " + err.Error())
	}
	fmt.Println("server shutdown successfully")
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

	config, err := vlogsServer.InitConfig(cf)
	if err != nil {
		fmt.Println(err)
		return
	}
	rs := RestartableServer{
		configFile: cf,
	}
	rs.Serve(config)
}
