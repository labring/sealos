package router

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/sirupsen/logrus"

	"github.com/labring/sealos/controllers/pkg/utils/env"

	"github.com/prometheus/client_golang/prometheus/promhttp"

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
	ctx := context.Background()
	if err := dao.Init(ctx); err != nil {
		log.Fatalf("Error initializing database: %v", err)
	}
	defer func() {
		if err := dao.DBClient.Disconnect(ctx); err != nil {
			log.Fatalf("Error disconnecting database: %v", err)
		}
	}()
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))
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
		GET(helper.AdminGetUserRealNameInfo, api.AdminGetUserRealNameInfo).
		POST(helper.AdminChargeBilling, api.AdminChargeBilling)
	//POST(helper.AdminActiveBilling, api.AdminActiveBilling)
	docs.SwaggerInfo.Host = env.GetEnvWithDefault("SWAGGER_HOST", "localhost:2333")
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))

	// Create a buffered channel interrupt and use the signal.
	rootCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Start the HTTP server to listen on port 2333.
	srv := &http.Server{
		Addr:    ":2333",
		Handler: router,
	}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// process task
	if os.Getenv("REWARD_PROCESSING") == "true" {
		fmt.Println("Start reward processing timer")
		go startRewardProcessingTimer(ctx)
	}
	dao.BillingTask.Start()
	// process llm task
	go startReconcileBilling(ctx)

	// process hourly archive
	go startHourlyBillingActiveArchive(ctx)

	// Wait for interrupt signal.
	<-rootCtx.Done()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown: ", err)
	}

	dao.BillingTask.Stop()

	log.Println("Server exiting")
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

func startReconcileBilling(ctx context.Context) {
	// initialize to one hour ago
	lastReconcileTime.Store(time.Now().UTC().Add(-time.Hour))

	tickerTime, err := time.ParseDuration(env.GetEnvWithDefault("BILLING_RECONCILE_INTERVAL", "5s"))
	if err != nil {
		logrus.Errorf("Failed to parse LLM_BILLING_RECONCILE_INTERVAL: %v", err)
		tickerTime = 5 * time.Second
	}
	// create a timer and execute it once every minute
	ticker := time.NewTicker(tickerTime)
	defer ticker.Stop()

	logrus.Info("Starting LLM billing reconciliation service, interval: ", tickerTime.String())

	// This command is executed for the first time to process the data within the last hour
	startTime, endTime := time.Now().UTC().Add(-time.Hour), time.Now().UTC()
	dao.BillingTask.AddTask(&dao.ActiveBillingReconcile{
		StartTime: startTime,
		EndTime:   endTime,
	})
	lastReconcileTime.Store(endTime)

	for {
		select {
		case <-ctx.Done():
			logrus.Info("Stopping LLM billing reconciliation service")
			return
		case t := <-ticker.C:
			currentTime := t.UTC()
			lastTime := lastReconcileTime.Load().(time.Time)
			//doBillingReconcile(lastTime, currentTime)
			dao.BillingTask.AddTask(&dao.ActiveBillingReconcile{
				StartTime: lastTime,
				EndTime:   currentTime,
			})
			lastReconcileTime.Store(currentTime)
		}
	}
}

func startHourlyBillingActiveArchive(ctx context.Context) {
	logrus.Info("Starting hourly billing active archive service")
	now := time.Now().UTC()
	lastHourStart := time.Date(now.Year(), now.Month(), now.Day(), now.Hour()-1, 0, 0, 0, now.Location())

	dao.BillingTask.AddTask(&dao.ArchiveBillingReconcile{
		StartTime: lastHourStart,
	})
	nextHour := time.Date(now.Year(), now.Month(), now.Day(), now.Hour()+1, 0, 0, 0, now.Location())
	for {
		select {
		case <-ctx.Done():
			logrus.Info("Stopping hourly billing archive service")
			return
		case <-time.After(time.Until(nextHour)):
			currentHour := nextHour.Add(-time.Hour)
			dao.BillingTask.AddTask(&dao.ArchiveBillingReconcile{
				StartTime: currentHour,
			})
			nextHour = nextHour.Add(time.Hour)
		}
	}
}
