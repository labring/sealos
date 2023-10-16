package router

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/api"
	"github.com/labring/sealos/service/pay/helper"
)

func RegisterPayRouter() {
	router := gin.Default()
	// Add logging middleware
	// router.Use(conf.RequestLogger())
	// router.Use(conf.ResponseLogger())
	client := helper.InitMongoClient(os.Getenv(helper.DBURI))

	payGroup := router.Group(helper.GROUP)
	{
		payGroup.PUT(helper.CreatePayMethod, func(c *gin.Context) {
			api.CreatePayMethod(c, client)
		})
		payGroup.PUT(helper.CreatePayApp, func(c *gin.Context) {
			api.CreatePayApp(c, client)
		})
		payGroup.GET(helper.GetAppDetails, func(c *gin.Context) {
			api.GetAppDetails(c, client)
		})
		payGroup.GET(helper.GetSession, func(c *gin.Context) {
			api.GetSession(c, client)
		})
		payGroup.GET(helper.GetPayStatus, func(c *gin.Context) {
			api.GetPayStatus(c, client)
		})
		payGroup.GET(helper.GetBill, func(c *gin.Context) {
			api.GetBill(c, client)
		})
	}

	// Create a buffered channel interrupt and use the signal.
	interrupt := make(chan os.Signal, 1)
	// Notify function to send the os Interrupt and SIGTERM signals to this channel
	signal.Notify(interrupt, os.Interrupt, syscall.SIGTERM)

	// Start the HTTP server to listen on port 8080, accept the request, and process it
	go func() {
		err := router.Run(":2303")
		fmt.Println("pay service is running on port 2303")
		if err != nil {
			log.Fatalf("Error running server: %v", err)
		}
	}()

	// Wait for interrupt signal
	<-interrupt

	fmt.Println("pay service is shutting down")
	// disconnect the MongoDB client
	if err := client.Disconnect(context.Background()); err != nil {
		log.Fatalf("Error disconnecting client: %v", err)
	}

	// terminate procedure
	os.Exit(0)
}
