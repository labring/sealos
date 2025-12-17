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

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/utils/env"
	"github.com/labring/sealos/service/account/api"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/docs"
	"github.com/labring/sealos/service/account/helper"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/sirupsen/logrus"
	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func RegisterPayRouter() {
	router := gin.New()
	router.Use(gin.LoggerWithConfig(gin.LoggerConfig{
		SkipPaths: []string{"/health", "/health/"}, // 包含可能的路径变体
		Skip: func(c *gin.Context) bool {
			// If the returned status code is 200: /admin/v1alpha1/flush-debt-resource-status request, skip the log
			if c.Request.URL.Path == helper.AdminGroup+helper.AdminFlushDebtResourceStatus &&
				c.Writer.Status() == http.StatusOK {
				return true
			}
			return false
		},
	}))
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
		POST(helper.GetAppTypeCosts, api.GetAppTypeCosts).
		POST(helper.GetAccount, api.GetAccount).
		POST(helper.DeleteAccount, api.DeleteAccount).
		POST(helper.GetPayment, api.GetPayment).
		POST(helper.GetPaymentStatus, api.GetPaymentStatus).
		POST(helper.GetRechargeAmount, api.GetRechargeAmount).
		POST(helper.GetConsumptionAmount, api.GetConsumptionAmount).
		POST(helper.GetWorkspaceConsumptionAmount, api.GetWorkspaceConsumptionAmount).
		POST(helper.GetWorkspaceAppCosts, api.GetWorkspaceAPPCosts).
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
		POST(helper.GetUserRealNameInfo, api.GetUserRealNameInfo).
		POST(helper.WorkspaceGetResourceQuota, api.GetWorkspaceResourceQuota).
		// UserAlertNotificationAccount routes
		POST(helper.UserAlertNotificationAccountCreate, api.CreateUserAlertNotificationAccount).
		POST(helper.UserAlertNotificationAccountList, api.ListUserAlertNotificationAccounts).
		POST(helper.UserAlertNotificationAccountDelete, api.DeleteUserAlertNotificationAccount).
		POST(helper.UserAlertNotificationAccountToggle, api.ToggleUserAlertNotificationAccounts).
		// WorkspaceSubscription routes
		POST(helper.WorkspaceSubscriptionInfo, api.GetWorkspaceSubscriptionInfo).
		POST(helper.WorkspaceSubscriptionList, api.GetWorkspaceSubscriptionList).
		POST(helper.WorkspaceSubscriptionDelete, api.DeleteWorkspaceSubscription).
		POST(helper.WorkspaceSubscriptionPaymentList, api.GetWorkspaceSubscriptionPaymentList).
		POST(helper.WorkspaceSubscriptionPlanList, api.GetWorkspaceSubscriptionPlanList).
		POST(helper.WorkspaceSubscriptionLastTransaction, api.GetLastWorkspaceSubscriptionTransaction).
		POST(helper.WorkspaceSubscriptionUpgradeAmount, api.GetWorkspaceSubscriptionUpgradeAmount).
		POST(helper.WorkspaceSubscriptionPay, api.CreateWorkspaceSubscriptionPay).
		POST(helper.WorkspaceSubscriptionNotify, api.NewWorkspaceSubscriptionNotifyHandler).
		POST(helper.WorkspaceSubscriptionPortalSession, api.CreateWorkspaceSubscriptionPortalSession).
		POST(helper.WorkspaceSubscriptionPlans, api.GetWorkspaceSubscriptionPlans).
		POST(helper.WorkspaceSubscriptionCardManage, api.CreateWorkspaceSubscriptionSetupIntent).
		POST(helper.WorkspaceSubscriptionCardInfo, api.GetWorkspaceSubscriptionCardInfo)
	adminGroup := router.Group(helper.AdminGroup).
		GET(helper.AdminGetAccountWithWorkspace, api.AdminGetAccountWithWorkspaceID).
		GET(helper.AdminGetUserRealNameInfo, api.AdminGetUserRealNameInfo).
		GET(helper.AdminWorkspaceSubscriptionList, api.AdminWorkspaceSubscriptionListGET).
		GET(helper.AdminSubscriptionPlans, api.AdminSubscriptionPlansGET).
		POST(helper.AdminCreateCorporate, api.AdminCreateCorporate).
		POST(helper.AdminRefundForms, api.AdminPaymentRefund).
		POST(helper.AdminChargeBilling, api.AdminChargeBilling).
		POST(helper.AdminFlushDebtResourceStatus, api.AdminFlushDebtResourceStatus).
		POST(helper.AdminSuspendUserTraffic, api.AdminSuspendUserTraffic).
		POST(helper.AdminResumeUserTraffic, api.AdminResumeUserTraffic).
		POST(helper.AdminWorkspaceSubscriptionProcessExpired, api.AdminProcessExpiredWorkspaceSubscriptions).
		POST(helper.AdminWorkspaceSubscriptionAdd, api.AdminAddWorkspaceSubscription).
		POST(helper.AdminWorkspaceSubscriptionList, api.AdminWorkspaceSubscriptionList).
		POST(helper.AdminSubscriptionPlans, api.AdminSubscriptionPlans).
		POST(helper.AdminSubscriptionPlanManage, api.AdminManageSubscriptionPlan).
		POST(helper.AdminSubscriptionPlanDelete, api.AdminDeleteSubscriptionPlan)
	paymentGroup := router.Group(helper.PaymentGroup).
		POST(helper.CreatePay, api.CreateCardPay).
		POST(helper.Notify, api.NewPayNotifyHandler).
		POST(helper.CardList, api.ListCard).
		POST(helper.CardDelete, api.DeleteCard).
		POST(helper.CardSetDefault, api.SetDefaultCard).
		POST(helper.CreditsInfo, api.GetCreditsInfo)

	_true := "true"
	if os.Getenv(helper.EnvSubscriptionEnabled) == _true {
		paymentGroup.POST(helper.SubscriptionUserInfo, api.GetSubscriptionUserInfo).
			POST(helper.SubscriptionPlanList, api.GetSubscriptionPlanList).
			POST(helper.SubscriptionLastTransaction, api.GetLastSubscriptionTransaction).
			POST(helper.SubscriptionUpgradeAmount, api.GetSubscriptionUpgradeAmount).
			POST(helper.SubscriptionFlushQuota, api.FlushSubscriptionQuota).
			POST(helper.SubscriptionQuotaCheck, api.CheckSubscriptionQuota).
			POST(helper.SubscriptionPay, api.CreateSubscriptionPay).
			POST(helper.SubscriptionNotify, api.NewSubscriptionPayNotifyHandler)
		adminGroup.POST(helper.AdminFlushSubQuota, api.AdminFlushSubscriptionQuota)

		processor := api.NewSubscriptionProcessor(dao.DBClient.GetGlobalDB())
		err := api.InitSubscriptionProcessorTables(dao.DBClient.GetGlobalDB())
		if err != nil {
			log.Fatalf("Error initializing subscription processor tables: %v", err)
		}
		go processor.StartProcessing(ctx)
		if os.Getenv(helper.EnvKycProcessEnabled) == _true {
			go processor.StartKYCProcessing(ctx)
		}
		// go processor.StartFlushQuotaProcessing(ctx)
	}
	// POST(helper.AdminActiveBilling, api.AdminActiveBilling)
	docs.SwaggerInfo.Host = env.GetEnvWithDefault("SWAGGER_HOST", "localhost:2333")
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})

	// Create a buffered channel interrupt and use the signal.
	rootCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Start the HTTP server to listen on port 2333.
	srv := &http.Server{
		Addr:              ":2333",
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// process task
	if os.Getenv("REWARD_PROCESSING") == _true {
		fmt.Println("Start reward processing timer")
		go startRewardProcessingTimer(ctx)
	}
	dao.BillingTask.Start()
	// process llm task
	go startReconcileBilling(ctx)

	// process hourly archive
	go startHourlyBillingActiveArchive(ctx)

	// process expired workspace subscriptions
	go startExpiredWorkspaceSubscriptionProcessing(ctx)

	workspaceSub := api.NewWorkspaceSubscriptionProcessor()
	workspaceSub.Start(ctx)

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
			lastTime, ok := lastReconcileTime.Load().(time.Time)
			if !ok {
				logrus.Errorf("Invalid last reconcile time: %v", lastReconcileTime)
				continue
			}
			// doBillingReconcile(lastTime, currentTime)
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
	lastHourStart := time.Date(
		now.Year(),
		now.Month(),
		now.Day(),
		now.Hour()-1,
		0,
		0,
		0,
		now.Location(),
	)

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

func startExpiredWorkspaceSubscriptionProcessing(ctx context.Context) {
	logrus.Info("Starting expired workspace subscription processing service")

	// 设置处理间隔，默认每小时处理一次
	intervalStr := env.GetEnvWithDefault("WORKSPACE_SUBSCRIPTION_PROCESS_INTERVAL", "1h")
	interval, err := time.ParseDuration(intervalStr)
	if err != nil {
		logrus.Errorf(
			"Failed to parse WORKSPACE_SUBSCRIPTION_PROCESS_INTERVAL: %v, using default 1h",
			err,
		)
		interval = time.Hour
	}

	logrus.Infof("Expired workspace subscription processing interval: %s", interval.String())

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// 启动后立即执行一次
	// if err := dao.DBClient.ProcessExpiredWorkspaceSubscriptions(); err != nil {
	//	logrus.Errorf("Initial expired workspace subscription processing failed: %v", err)
	//}

	for {
		select {
		case <-ctx.Done():
			logrus.Info("Stopping expired workspace subscription processing service")
			return
		case <-ticker.C:
			logrus.Debug("Processing expired workspace subscriptions...")
			// if err := dao.DBClient.ProcessExpiredWorkspaceSubscriptions(); err != nil {
			//	logrus.Errorf("Expired workspace subscription processing failed: %v", err)
			// } else {
			//	logrus.Debug("Expired workspace subscription processing completed successfully")
			//}
		}
	}
}
