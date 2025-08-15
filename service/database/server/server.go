package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/labring/sealos/service/pkg/server"
)

type DatabaseServer struct {
	ConfigFile string
}

func (rs *DatabaseServer) Serve(c *server.Config) {
	ps, err := server.NewPromServer(c)
	if err != nil {
		fmt.Printf("Failed to create auth server: %s\n", err)
		return
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	hs := &http.Server{
		Addr:              c.Server.ListenAddress,
		Handler:           ps,
		ReadHeaderTimeout: time.Second * 5,
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
		return
	}
	fmt.Println("server shutdown successfully")
}
