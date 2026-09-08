/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package main

import (
	"context"
	"errors"
	"flag"
	"net/http"
	"os"
	"strconv"
	"time"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/account/controllers"
	"github.com/labring/sealos/controllers/account/controllers/cache"
	"github.com/labring/sealos/controllers/account/controllers/utils"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/database/mongo"
	notificationv1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils/env"
	"github.com/labring/sealos/controllers/pkg/utils/maps"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	"k8s.io/utils/ptr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	ctrlconfig "sigs.k8s.io/controller-runtime/pkg/config"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
	"sigs.k8s.io/controller-runtime/pkg/manager"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
	"sigs.k8s.io/controller-runtime/pkg/webhook"
)

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
)

type readinessRunnable struct {
	manager.RunnableFunc
}

func (readinessRunnable) NeedLeaderElection() bool {
	return false
}

var _ manager.LeaderElectionRunnable = readinessRunnable{}

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))

	utilruntime.Must(accountv1.AddToScheme(scheme))
	utilruntime.Must(userv1.AddToScheme(scheme))
	utilruntime.Must(notificationv1.AddToScheme(scheme))
	// utilruntime.Must(kbv1alpha1.SchemeBuilder.AddToScheme(scheme))
	//+kubebuilder:scaffold:scheme
}

func beginStartupStage(name string) func(error) {
	startedAt := time.Now()
	setupLog.Info("startup stage started", "stage", name)
	return func(err error) {
		duration := time.Since(startedAt)
		if err != nil {
			setupLog.Error(err,
				"startup stage failed",
				"stage",
				name,
				"duration_ms",
				duration.Milliseconds(),
			)
			return
		}
		setupLog.Info(
			"startup stage completed",
			"stage",
			name,
			"duration_ms",
			duration.Milliseconds(),
		)
	}
}

func measureStartupStage(name string, fn func() error) error {
	finish := beginStartupStage(name)
	err := fn()
	finish(err)
	return err
}

func main() {
	var (
		metricsAddr              string
		enableLeaderElection     bool
		probeAddr                string
		concurrent               int
		deleteResourceConcurrent int
		deleteBackupConcurrent   int
		development              bool
		rateLimiterOptions       = &utils.LimiterOptions{}
		leaseDuration            time.Duration
		renewDeadline            time.Duration
		retryPeriod              time.Duration
	)
	flag.StringVar(
		&metricsAddr,
		"metrics-bind-address",
		":8080",
		"The address the metric endpoint binds to.",
	)
	flag.StringVar(
		&probeAddr,
		"health-probe-bind-address",
		":8081",
		"The address the probe endpoint binds to.",
	)
	flag.BoolVar(&development, "development", false, "Enable development mode.")
	flag.BoolVar(&enableLeaderElection, "leader-elect", true,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
	flag.IntVar(&concurrent, "concurrent", 100, "The number of concurrent cluster reconciles.")
	flag.IntVar(
		&deleteResourceConcurrent,
		"delete-resource-concurrent",
		3,
		"The number of concurrent DeleteUserResource calls.",
	)
	flag.IntVar(
		&deleteBackupConcurrent,
		"delete-backup-concurrent",
		30,
		"The maximum number of concurrent backup deletions.",
	)
	flag.DurationVar(
		&leaseDuration,
		"leader-elect-lease-duration",
		60*time.Second,
		"Duration that non-leader candidates will wait to force acquire leadership.",
	)
	flag.DurationVar(
		&renewDeadline,
		"leader-elect-renew-deadline",
		40*time.Second,
		"Duration the acting master will retry refreshing leadership before giving up.",
	)
	flag.DurationVar(
		&retryPeriod,
		"leader-elect-retry-period",
		5*time.Second,
		"Duration the LeaderElector clients should wait between tries of actions.",
	)
	opts := zap.Options{
		Development: development,
	}
	rateLimiterOptions.BindFlags(flag.CommandLine)
	opts.BindFlags(flag.CommandLine)
	flag.Parse()

	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))
	ctx := ctrl.SetupSignalHandler()
	probeState := &probeState{}
	if err := startProbeServer(ctx, probeAddr, probeState); err != nil {
		setupLog.Error(err, "unable to start probe server")
		os.Exit(1)
	}
	// local test env
	// err := godotenv.Load()
	// if err != nil {
	//	setupLog.Error(err, "unable to load .env file")
	//}

	var mgr ctrl.Manager
	err := measureStartupStage("create manager", func() error {
		var stageErr error
		mgr, stageErr = ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
			Scheme: scheme,
			Cache:  cache.Options(),
			Client: client.Options{
				Cache: &client.CacheOptions{DisableFor: cache.UncachedObjects()},
			},
			Metrics: metricsserver.Options{
				BindAddress: metricsAddr,
			},
			// Probes are served by the standalone server started before the expensive
			// dependency and controller initialization below.
			HealthProbeBindAddress: "0",
			LeaderElection:         enableLeaderElection,
			LeaderElectionID:       "a63686c3.sealos.io",
			LeaseDuration:          &leaseDuration,
			RenewDeadline:          &renewDeadline,
			RetryPeriod:            &retryPeriod,
			Controller: ctrlconfig.Controller{
				UsePriorityQueue: ptr.To(true),
			},
		})
		return stageErr
	})
	if err != nil {
		setupLog.Error(err, "unable to start manager")
		os.Exit(1)
	}
	var watchClient client.WithWatch
	err = measureStartupStage("create Kubernetes watch client", func() error {
		var stageErr error
		watchClient, stageErr = client.NewWithWatch(mgr.GetConfig(), client.Options{
			Scheme: mgr.GetScheme(),
			Mapper: mgr.GetRESTMapper(),
		})
		return stageErr
	})
	if err != nil {
		setupLog.Error(err, "unable to get watch client")
		os.Exit(1)
	}
	rateOpts := controller.Options{
		MaxConcurrentReconciles: concurrent,
		RateLimiter:             utils.GetRateLimiter(rateLimiterOptions),
	}
	dbCtx := context.Background()
	var dbClient database.Interface
	err = measureStartupStage("connect account MongoDB", func() error {
		var stageErr error
		dbClient, stageErr = mongo.NewMongoInterface(dbCtx, os.Getenv(database.MongoURI))
		return stageErr
	})
	if err != nil {
		setupLog.Error(err, "unable to connect to mongo")
		os.Exit(1)
	}
	defer func() {
		err := dbClient.Disconnect(dbCtx)
		if err != nil {
			setupLog.Error(err, "unable to disconnect from mongo")
		}
	}()
	var cvmDBClient database.Interface
	cvmURI := os.Getenv(database.CVMMongoURI)
	if cvmURI != "" {
		err = measureStartupStage("connect CVM MongoDB", func() error {
			var stageErr error
			cvmDBClient, stageErr = mongo.NewMongoInterface(dbCtx, cvmURI)
			return stageErr
		})
		if err != nil {
			setupLog.Error(err, "unable to connect to mongo")
			os.Exit(1)
		}
	}
	defer func() {
		if cvmDBClient != nil {
			err := cvmDBClient.Disconnect(dbCtx)
			if err != nil {
				setupLog.Error(err, "unable to disconnect from mongo")
			}
		}
	}()
	var v2Account *cockroach.Cockroach
	err = measureStartupStage("connect CockroachDB", func() error {
		var stageErr error
		v2Account, stageErr = cockroach.NewCockRoach(
			os.Getenv(database.GlobalCockroachURI),
			os.Getenv(database.LocalCockroachURI),
		)
		return stageErr
	})
	if err != nil {
		setupLog.Error(err, "unable to connect to cockroach")
		os.Exit(1)
	}
	defer func() {
		err := v2Account.Close()
		if err != nil {
			setupLog.Error(err, "unable to disconnect from cockroach")
		}
	}()
	err = measureStartupStage("initialize region environment", func() error {
		return database.InitRegionEnv(
			v2Account.GetGlobalDB(),
			v2Account.GetLocalRegion().Domain,
		)
	})
	if err != nil {
		setupLog.Error(err, "unable to init region env")
		os.Exit(1)
	}
	if os.Getenv(cockroach.EnvBaseBalance) != "" {
		balance, err := strconv.ParseInt(os.Getenv(cockroach.EnvBaseBalance), 10, 64)
		if err == nil {
			v2Account.ZeroAccount.Balance = balance
		}
	}
	skipExpiredUserTimeDuration := time.Hour * 24 * 2
	if os.Getenv("SKIP_EXPIRED_USER_TIME") != "" {
		skipExpiredUserTimeDuration, err = time.ParseDuration(os.Getenv("SKIP_EXPIRED_USER_TIME"))
		if err != nil {
			setupLog.Error(err, "unable to parse skip expired user time")
			os.Exit(1)
		}
	}
	setupLog.Info("skip expired user time", "duration", skipExpiredUserTimeDuration)
	accountReconciler := &controllers.AccountReconciler{
		Client:                      mgr.GetClient(),
		Scheme:                      mgr.GetScheme(),
		DBClient:                    dbClient,
		AccountV2:                   v2Account,
		CVMDBClient:                 cvmDBClient,
		SkipExpiredUserTimeDuration: skipExpiredUserTimeDuration,
	}
	finishRechargeConfig := beginStartupStage("parse recharge config")
	activities, discountSteps, discountRatios, err := controllers.RawParseRechargeConfig()
	finishRechargeConfig(err)
	if err != nil {
		setupLog.Error(err, "parse recharge config failed")
	} else {
		setupLog.Info(
			"parse recharge config success",
			"activities",
			activities,
			"discountSteps",
			discountSteps,
			"discountRatios",
			discountRatios,
		)
		accountReconciler.Activities = activities
		accountReconciler.DefaultDiscount = types.RechargeDiscount{
			DiscountRates: discountRatios,
			DiscountSteps: discountSteps,
		}
	}
	setupManagerError := func(err error, controller string) {
		setupLog.Error(err, "unable to create controller", "controller", controller)
		os.Exit(1)
	}
	if err = measureStartupStage("setup account controller", func() error {
		return accountReconciler.SetupWithManager(mgr, rateOpts)
	}); err != nil {
		setupManagerError(err, "Account")
	}
	debtUserMap := maps.NewConcurrentMap()
	debtController := &controllers.DebtReconciler{
		AccountReconciler:           accountReconciler,
		Client:                      mgr.GetClient(),
		Scheme:                      mgr.GetScheme(),
		AccountV2:                   v2Account,
		DebtUserMap:                 debtUserMap,
		InitUserAccountFunc:         accountReconciler.InitUserAccountFunc,
		SkipExpiredUserTimeDuration: skipExpiredUserTimeDuration,
	}
	finishDebtInit := beginStartupStage("initialize debt controller")
	debtController.Init()
	finishDebtInit(nil)

	// Setup OperationRequest monitor controller to trigger debt status refresh on owner transfers
	operationRequestMonitor := &controllers.OperationRequestMonitorReconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
	}
	if err = measureStartupStage("setup operation request monitor", func() error {
		return operationRequestMonitor.SetupWithManager(mgr)
	}); err != nil {
		setupManagerError(err, "OperationRequestMonitor")
	}

	// if err = (&controllers.DebtReconciler{
	//	AccountReconciler:           accountReconciler,
	//	Client:                      mgr.GetClient(),
	//	Scheme:                      mgr.GetScheme(),
	//	AccountV2:                   v2Account,
	//	DebtUserMap:                 debtUserMap,
	//	InitUserAccountFunc:         accountReconciler.InitUserAccountFunc,
	//	SkipExpiredUserTimeDuration: skipExpiredUserTimeDuration,
	// }).SetupWithManager(mgr, rateOpts); err != nil {
	//	setupManagerError(err, "Debt")
	//}

	if err = measureStartupStage("setup cache indexes", func() error {
		return cache.SetupCache(mgr)
	}); err != nil {
		setupLog.Error(err, "unable to cache controller")
		os.Exit(1)
	}
	_true := "true"
	if os.Getenv("DISABLE_WEBHOOKS") == _true {
		setupLog.Info("disable all webhooks")
	} else {
		mgr.GetWebhookServer().
			Register("/validate-v1-sealos-cloud", &webhook.Admission{Handler: &accountv1.DebtValidate{Client: mgr.GetClient(), AccountV2: v2Account, TTLUserMap: maps.New[*types.UsableBalanceWithCredits](env.GetIntEnvWithDefault("DEBT_WEBHOOK_CACHE_USER_TTL", 15))}})
		// Start HTTP server for property reload handler (without TLS)
		jwtSecret := os.Getenv(controllers.EnvJwtSecret)
		adminJwtSecret := os.Getenv(controllers.EnvAdminJwtSecret)
		reloadHandler := &controllers.PropertyReloadHandler{
			AccountReconciler: accountReconciler,
			DBClient:          dbClient,
			JwtSecret:         jwtSecret,
			AdminJwtSecret:    adminJwtSecret,
		}
		go func() {
			setupLog.Info("starting property reload HTTP server", "port", 9444)
			server := &http.Server{
				Addr:              ":9444",
				Handler:           reloadHandler,
				ReadHeaderTimeout: 10 * time.Second,
			}
			if err := server.ListenAndServe(); err != nil {
				setupLog.Error(err, "failed to start property reload HTTP server")
			}
		}()
	}

	err = measureStartupStage(
		"load property types from MongoDB",
		dbClient.InitDefaultPropertyTypeLS,
	)
	if err != nil {
		setupLog.Error(err, "unable to get property type")
		os.Exit(1)
	}
	billingReconciler := controllers.BillingReconciler{
		DBClient:    dbClient,
		Properties:  resources.DefaultPropertyTypeLS,
		Client:      mgr.GetClient(),
		Scheme:      mgr.GetScheme(),
		AccountV2:   v2Account,
		DebtUserMap: debtUserMap,
	}
	if err = measureStartupStage(
		"initialize billing reconciler and indexes",
		billingReconciler.Init,
	); err != nil {
		setupLog.Error(err, "unable to init billing reconciler")
		os.Exit(1)
	}
	billingTaskRunner := &controllers.BillingTaskRunner{
		BillingReconciler: &billingReconciler,
	}
	if err := measureStartupStage("add billing task runner", func() error {
		return mgr.Add(billingTaskRunner)
	}); err != nil {
		setupLog.Error(err, "unable to add billing task runner")
		os.Exit(1)
	}
	if env.GetEnvWithDefault("SUPPORT_DEBT", _true) == _true {
		if err := measureStartupStage("add debt controller", func() error {
			return mgr.Add(debtController)
		}); err != nil {
			setupLog.Error(err, "unable to add debt controller")
			os.Exit(1)
		}
	}

	if err = measureStartupStage("setup pod controller", func() error {
		return (&controllers.PodReconciler{
			Client: mgr.GetClient(),
			Scheme: mgr.GetScheme(),
		}).SetupWithManager(mgr)
	}); err != nil {
		setupManagerError(err, "Pod")
	}
	if err = measureStartupStage("setup namespace controller", func() error {
		return (&controllers.NamespaceReconciler{
			Client: watchClient,
			Scheme: mgr.GetScheme(),
		}).SetupWithManager(mgr, rateOpts, deleteResourceConcurrent, deleteBackupConcurrent)
	}); err != nil {
		setupManagerError(err, "Namespace")
	}

	if err = measureStartupStage("setup payment controller", func() error {
		return (&controllers.PaymentReconciler{
			Account:        accountReconciler,
			DebtReconciler: debtController,
			WatchClient:    watchClient,
			Client:         mgr.GetClient(),
			Scheme:         mgr.GetScheme(),
		}).SetupWithManager(mgr)
	}); err != nil {
		setupManagerError(err, "Payment")
	}
	var trafficDBClient database.Interface
	err = measureStartupStage("connect traffic MongoDB", func() error {
		var stageErr error
		trafficDBClient, stageErr = mongo.NewMongoInterface(
			dbCtx,
			os.Getenv(database.TrafficMongoURI),
		)
		return stageErr
	})
	if err != nil {
		setupLog.Error(err, "unable to connect to traffic mongo")
		os.Exit(1)
	}
	workspaceTrafficProcessor := controllers.NewWorkspaceTrafficController(
		accountReconciler,
		trafficDBClient,
	)
	// workspaceSubscriptionProcessor, err := controllers.NewWorkspaceSubscriptionProcessor(accountReconciler, workspaceTrafficProcessor)
	// if err != nil {
	//	setupLog.Error(err, "unable to create workspace subscription processor")
	//	os.Exit(1)
	//}
	workspaceSubDebtProcessor := controllers.NewWorkspaceSubscriptionDebtProcessor(
		accountReconciler,
	)
	go workspaceTrafficProcessor.ProcessTrafficWithTimeRange()
	// workspaceSubscriptionProcessor.Start(ctx)
	workspaceSubDebtProcessor.Start(ctx)

	//+kubebuilder:scaffold:builder

	if err := measureStartupStage("register readiness marker", func() error {
		return mgr.Add(readinessRunnable{
			RunnableFunc: manager.RunnableFunc(func(ctx context.Context) error {
				finishCacheSync := beginStartupStage("manager cache sync")
				if !mgr.GetCache().WaitForCacheSync(ctx) {
					cacheSyncErr := ctx.Err()
					if cacheSyncErr == nil {
						cacheSyncErr = errors.New("cache synchronization failed")
					}
					finishCacheSync(cacheSyncErr)
					return nil
				}
				finishCacheSync(nil)
				probeState.markReady()
				<-ctx.Done()
				return nil
			}),
		})
	}); err != nil {
		setupLog.Error(err, "unable to set up readiness marker")
		os.Exit(1)
	}

	if cvmDBClient != nil {
		cvmTaskRunner := &controllers.CVMTaskRunner{
			DBClient:          cvmDBClient,
			Logger:            ctrl.Log.WithName("CVMTaskRunner"),
			AccountReconciler: accountReconciler,
		}
		if err := measureStartupStage("add CVM task runner", func() error {
			return mgr.Add(cvmTaskRunner)
		}); err != nil {
			setupLog.Error(err, "unable to add cvm task runner")
			os.Exit(1)
		}
	}
	// go func() {
	//	now := time.Now()
	//	nextHour := now.Truncate(time.Hour).Add(time.Hour)
	//	time.Sleep(nextHour.Sub(now))
	//
	//	ticker := time.NewTicker(time.Hour)
	//	defer ticker.Stop()
	//	for {
	//		setupLog.Info("start billing reconcile", "time", time.Now().Format(time.RFC3339))
	//		if err := billingReconciler.ExecuteBillingTask(); err != nil {
	//			setupLog.Error(err, "failed to execute billing task")
	//		}
	//		<-ticker.C
	//	}
	// }()

	probeState.markStartupReady()
	setupLog.Info("starting manager")
	if err := mgr.Start(ctx); err != nil {
		setupLog.Error(err, "fail to run manager")
		os.Exit(1)
	}
}
