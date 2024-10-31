package router

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/sirupsen/logrus"

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
	ctx := context.Background()
	defer func() {
		if err := dao.DBClient.Disconnect(ctx); err != nil {
			log.Fatalf("Error disconnecting database: %v", err)
		}
	}()
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
		POST(helper.GetAllRegionConsumptionAmount, api.GetAllRegionConsumptionAmount).
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
		POST(helper.GetInvoicePayment, api.GetInvoicePayment).
		POST(helper.UseGiftCode, api.UseGiftCode).
		POST(helper.UserUsage, api.UserUsage).
		POST(helper.GetRechargeDiscount, api.GetRechargeDiscount).
		POST(helper.GetUserRealNameInfo, api.GetUserRealNameInfo)
	router.Group(helper.AdminGroup).
		GET(helper.AdminGetAccountWithWorkspace, api.AdminGetAccountWithWorkspaceID).
		POST(helper.AdminChargeBilling, api.AdminChargeBilling)
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

	// process task
	if os.Getenv("REWARD_PROCESSING") == "true" {
		fmt.Println("Start reward processing timer")
		go startRewardProcessingTimer(ctx)
	}
	// process llm task
	go startReconcileLLMBilling(ctx)

	// process hourly archive
	go StartHourlyLLMBillingArchive(ctx)
	// Wait for interrupt signal.
	<-interrupt

	// Terminate procedure.
	os.Exit(0)
}

func startRewardProcessingTimer(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			if err := dao.DBClient.ProcessPendingTaskRewards(); err != nil {
				log.Printf("Error processing pending task rewards: %v", err)
			}
		case <-ctx.Done():
			log.Println("Reward processing timer stopped")
			return
		}
	}
}

var lastReconcileTime atomic.Value

func startReconcileLLMBilling(ctx context.Context) {
	// initialize to one hour ago
	lastReconcileTime.Store(time.Now().UTC().Add(-time.Hour))

	// create a timer and execute it once every minute
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	logrus.Info("Starting LLM billing reconciliation service")

	// This command is executed for the first time to process the data within the last hour
	doLLMTokenReconcile(time.Now().UTC().Add(-time.Hour), time.Now().UTC())

	for {
		select {
		case <-ctx.Done():
			logrus.Info("Stopping LLM billing reconciliation service")
			return
		case t := <-ticker.C:
			currentTime := t.UTC()
			lastTime := lastReconcileTime.Load().(time.Time)
			doLLMTokenReconcile(lastTime, currentTime)
		}
	}
}

func StartHourlyLLMBillingArchive(ctx context.Context) {
	logrus.Info("Starting hourly LLM billing archive service")
	now := time.Now().UTC()
	lastHourStart := time.Date(now.Year(), now.Month(), now.Day(), now.Hour()-1, 0, 0, 0, now.Location())
	if err := doHourlyArchive(lastHourStart); err != nil {
		logrus.Errorf("Failed to archive last hour's LLM billing: %v", err)
	}
	nextHour := time.Date(now.Year(), now.Month(), now.Day(), now.Hour()+1, 0, 0, 0, now.Location())
	for {
		select {
		case <-ctx.Done():
			logrus.Info("Stopping hourly LLM billing archive service")
			return
		case <-time.After(time.Until(nextHour)):
			currentHour := nextHour.Add(-time.Hour)
			if err := doHourlyArchive(currentHour); err != nil {
				logrus.Errorf("Failed to archive hourly LLM billing: %v", err)
			}
			nextHour = nextHour.Add(time.Hour)
		}
	}
}

func doHourlyArchive(hourStart time.Time) error {
	hourEnd := hourStart.Add(time.Hour)
	logrus.Infof("Starting hourly archive from %v to %v", hourStart, hourEnd)

	const maxRetries = 3
	var lastErr error

	for i := 0; i < maxRetries; i++ {
		if err := dao.DBClient.ArchiveHourlyLLMBilling(hourStart, hourEnd); err != nil {
			lastErr = err
			logrus.Warnf("Retry %d: Failed to archive hourly LLM billing: %v", i+1, err)
			time.Sleep(time.Second * time.Duration(i+1))
			continue
		}
		logrus.Infof("Successfully archived LLM billing for hour starting at %v", hourStart)
		return nil
	}

	return fmt.Errorf("failed to archive hourly LLM billing after %d retries, last error: %v",
		maxRetries, lastErr)
}

func doLLMTokenReconcile(startTime, endTime time.Time) {
	logrus.Infof("Starting reconciliation from %v to %v", startTime, endTime)
	if err := dao.DBClient.ReconcileUnsettledLLMBilling(startTime, endTime); err != nil {
		logrus.Errorf("Failed to reconcile LLM billing: %v", err)
		return
	}
	lastReconcileTime.Store(endTime)
	logrus.Infof("Successfully reconciled LLM billing until %v", endTime)
}
