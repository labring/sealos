package router

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/labring/sealos/controllers/pkg/utils/env"

	"github.com/labring/sealos/service/account/docs"

	"github.com/labring/sealos/service/account/dao"

	"github.com/labring/sealos/service/account/api"

	"github.com/labring/sealos/service/account/helper"

	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"github.com/gin-gonic/gin"
)

func RegisterPayRouter() {
	router := gin.Default()

	if err := dao.InitDB(); err != nil {
		log.Fatalf("Error initializing database: %v", err)
	}
	// /account/v1alpha1/{/namespaces | /properties | {/costs | /costs/recharge | /costs/consumption | /costs/properties}}
	router.Group(helper.GROUP).
		POST(helper.GetHistoryNamespaces, api.GetBillingHistoryNamespaceList).
		POST(helper.GetProperties, api.GetProperties).
		POST(helper.GetUserCosts, api.GetCosts).
		POST(helper.GetAPPCosts, api.GetAPPCosts).
		POST(helper.GetAccount, api.GetAccount).
		POST(helper.GetPayment, api.GetPayment).
		POST(helper.GetRechargeAmount, api.GetRechargeAmount).
		POST(helper.GetConsumptionAmount, api.GetConsumptionAmount).
		POST(helper.GetPropertiesUsed, api.GetPropertiesUsedAmount).
		POST(helper.SetPaymentInvoice, api.SetPaymentInvoice). // will be deprecated
		POST(helper.SetTransfer, api.TransferAmount).
		POST(helper.GetTransfer, api.GetTransfer).
		POST(helper.CheckPermission, api.CheckPermission).
		POST(helper.GetRegions, api.GetRegions).
		POST(helper.GetOverview, api.GetCostOverview).
		POST(helper.GetAppList, api.GetCostAppList).
		POST(helper.GetAppTypeList, api.GetAppTypeList).
		POST(helper.GetBasicCostDistribution, api.GetBasicCostDistribution).
		POST(helper.GetAppCostTimeRange, api.GetAppCostTimeRange).
		POST(helper.GetInvoice, api.GetInvoice).
		POST(helper.ApplyInvoice, api.ApplyInvoice).
		POST(helper.SetStatusInvoice, api.SetStatusInvoice).
		POST(helper.GetInvoicePayment, api.GetInvoicePayment)
	docs.SwaggerInfo.Host = env.GetEnvWithDefault("SWAGGER_HOST", "localhost:2333")
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))

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
