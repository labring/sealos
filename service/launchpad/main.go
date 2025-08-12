package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	launchpadServer "github.com/labring/sealos/service/launchpad/server"
)

type RestartableServer struct {
	configFile string
}

func (rs *RestartableServer) Serve(c *launchpadServer.Config) {
	vs, err := launchpadServer.NewVMServer(c)
	if err != nil {
		fmt.Printf("Failed to create auth server: %s\n", err)
		return
	}

	hs := &http.Server{
		Addr:              c.Server.ListenAddress,
		Handler:           vs,
		ReadHeaderTimeout: time.Second * 5,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		if err := hs.ListenAndServe(); err != nil &&
			!errors.Is(err, http.ErrServerClosed) {
			fmt.Println("failed to start HTTP server: " + err.Error())
		}
	}()

	<-ctx.Done()

	shutdownSrvCtx, shutdownSrvCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownSrvCancel()

	if err := hs.Shutdown(shutdownSrvCtx); err != nil {
		fmt.Println("server forced to shutdown: " + err.Error())
		return
	}
	fmt.Println("server shutdown successfully")
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

	config, err := launchpadServer.InitConfig(cf)
	if err != nil {
		fmt.Println(err)
		return
	}
	rs := RestartableServer{
		configFile: cf,
	}
	rs.Serve(config)
}
