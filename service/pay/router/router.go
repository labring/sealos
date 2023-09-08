package router

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/api"
	"github.com/labring/sealos/service/pay/conf"
)

func RegisterPayRouter() {
	router := gin.Default()
	// Add logging middleware
	// router.Use(conf.RequestLogger())
	// router.Use(conf.ResponseLogger())

	payGroup := router.Group(conf.GROUP)
	{
		payGroup.PUT(conf.CreatePayMethod, api.CreatePayMethod)
		payGroup.PUT(conf.CreatePayApp, api.CreatePayApp)
		payGroup.GET(conf.GetAppDetails, api.GetAppDetails)
		payGroup.GET(conf.GetSession, api.GetSession)
		payGroup.GET(conf.GetPayStatus, api.GetPayStatus)
		payGroup.GET(conf.GetBill, api.GetBill)
	}

	// Start the HTTP server to listen on port 8080, accept the request, and process it
	err := router.Run(":8080")
	fmt.Println("pay service is running on port 8080")
	if err != nil {
		log.Fatalf("Error running server: %v", err)
	}
	//err := router.RunTLS(":8080", "./key/server.pem", "./key/server.key")
	//if err != nil {
	//	log.Fatalf("Error running server: %v", err)
	//}
}
