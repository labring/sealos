package router

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/labring/sealos/service/account/dao"

	"github.com/labring/sealos/service/account/api"

	"github.com/labring/sealos/service/account/helper"

	"github.com/gin-gonic/gin"
)

func RegisterPayRouter() {
	router := gin.Default()

	if err := dao.InitDB(); err != nil {
		log.Fatalf("Error initializing database: %v", err)
	}
	// /v1alpha1/account/{/namespaces | /properties | /costs}
	router.Group(helper.GROUP).
		POST(helper.GetHistoryNamespaces, api.GetBillingHistoryNamespaceList).
		POST(helper.GetProperties, api.GetProperties).
		POST(helper.GetUserCosts, api.GetCosts)

	// Create a buffered channel interrupt and use the signal.
	interrupt := make(chan os.Signal, 1)
	signal.Notify(interrupt, os.Interrupt, syscall.SIGTERM)

	// Start the HTTP server to listen on port 2333.
	go func() {
		err := router.Run(":2333")
		fmt.Println("account service is running on port 2333")
		if err != nil {
			log.Fatalf("Error running server: %v", err)
		}
	}()

	// Wait for interrupt signal.
	<-interrupt

	// Terminate procedure.
	os.Exit(0)
}
