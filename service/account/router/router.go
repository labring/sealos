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
	router.Group(helper.GROUP).
		//curl -X GET -H "Content-Type: application/json" -d '{"startTime": "2023-01-01T00:00:00Z", "endTime": "2023-12-01T00:00:00Z", "type": -1, "owner": "admin"}' http://localhost:2333/v1alpha1/account/namespaces
		POST(helper.GetHistoryNamespaces, func(c *gin.Context) {
			api.GetBillingHistoryNamespaceList(c)
		}).POST(helper.GetProperties, func(c *gin.Context) {
		api.GetProperties(c)
	}).POST(helper.GetUserCosts, func(c *gin.Context) {
		api.GetCosts(c)
	})

	// Create a buffered channel interrupt and use the signal.
	interrupt := make(chan os.Signal, 1)
	// Notify function to send the os Interrupt and SIGTERM signals to this channel
	signal.Notify(interrupt, os.Interrupt, syscall.SIGTERM)

	// Start the HTTP server to listen on port 8080, accept the request, and process it
	go func() {
		err := router.Run(":2333")
		fmt.Println("account service is running on port 2333")
		if err != nil {
			log.Fatalf("Error running server: %v", err)
		}
	}()

	// Wait for interrupt signal
	<-interrupt

	// terminate procedure
	os.Exit(0)
}
