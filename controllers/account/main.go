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
	"flag"
	"os"
	"time"

	"k8s.io/utils/ptr"
	ctrlconfig "sigs.k8s.io/controller-runtime/pkg/config"

	"github.com/labring/sealos/controllers/account/controllers/utils"

	"github.com/labring/sealos/controllers/pkg/utils/env"

	"github.com/labring/sealos/controllers/pkg/utils/maps"

	"github.com/labring/sealos/controllers/account/controllers/cache"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/database/mongo"
	notificationv1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/controllers/pkg/types"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"

	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
	"sigs.k8s.io/controller-runtime/pkg/webhook"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/account/controllers"
	//+kubebuilder:scaffold:imports
)

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))

	utilruntime.Must(accountv1.AddToScheme(scheme))
	utilruntime.Must(userv1.AddToScheme(scheme))
	utilruntime.Must(notificationv1.AddToScheme(scheme))
	//utilruntime.Must(kbv1alpha1.SchemeBuilder.AddToScheme(scheme))
	//+kubebuilder:scaffold:scheme
}

func main() {
	var (
		metricsAddr          string
		enableLeaderElection bool
		probeAddr            string
		concurrent           int
		development          bool
		rateLimiterOptions   = &utils.LimiterOptions{}
		leaseDuration        time.Duration
		renewDeadline        time.Duration
		retryPeriod          time.Duration
	)
	flag.StringVar(&metricsAddr, "metrics-bind-address", ":8080", "The address the metric endpoint binds to.")
	flag.StringVar(&probeAddr, "health-probe-bind-address", ":8081", "The address the probe endpoint binds to.")
	flag.BoolVar(&development, "development", false, "Enable development mode.")
	flag.BoolVar(&enableLeaderElection, "leader-elect", true,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
	flag.IntVar(&concurrent, "concurrent", 10, "The number of concurrent cluster reconciles.")
	flag.DurationVar(&leaseDuration, "leader-elect-lease-duration", 60*time.Second, "Duration that non-leader candidates will wait to force acquire leadership.")
	flag.DurationVar(&renewDeadline, "leader-elect-renew-deadline", 40*time.Second, "Duration the acting master will retry refreshing leadership before giving up.")
	flag.DurationVar(&retryPeriod, "leader-elect-retry-period", 5*time.Second, "Duration the LeaderElector clients should wait between tries of actions.")
	opts := zap.Options{
		Development: development,
	}
	rateLimiterOptions.BindFlags(flag.CommandLine)
	opts.BindFlags(flag.CommandLine)
	flag.Parse()

	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))
	// local test env
	//err := godotenv.Load()
	//if err != nil {
	//	setupLog.Error(err, "unable to load .env file")
	//}

	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
		Scheme: scheme,
		Metrics: metricsserver.Options{
			BindAddress: metricsAddr,
		},
		HealthProbeBindAddress: probeAddr,
		LeaderElection:         enableLeaderElection,
		LeaderElectionID:       "a63686c3.sealos.io",
		LeaseDuration:          &leaseDuration,
		RenewDeadline:          &renewDeadline,
		RetryPeriod:            &retryPeriod,
		Controller: ctrlconfig.Controller{
			UsePriorityQueue: ptr.To(true),
		},
	})
	if err != nil {
		setupLog.Error(err, "unable to start manager")
		os.Exit(1)
	}
	watchClient, err := client.NewWithWatch(mgr.GetConfig(), client.Options{
		Scheme: mgr.GetScheme(),
		Mapper: mgr.GetRESTMapper(),
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
	dbClient, err := mongo.NewMongoInterface(dbCtx, os.Getenv(database.MongoURI))
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
		cvmDBClient, err = mongo.NewMongoInterface(dbCtx, cvmURI)
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
	v2Account, err := cockroach.NewCockRoach(os.Getenv(database.GlobalCockroachURI), os.Getenv(database.LocalCockroachURI))
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
	if err = database.InitRegionEnv(v2Account.GetGlobalDB(), v2Account.GetLocalRegion().Domain); err != nil {
		setupLog.Error(err, "unable to init region env")
		os.Exit(1)
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
	activities, discountSteps, discountRatios, err := controllers.RawParseRechargeConfig()
	if err != nil {
		setupLog.Error(err, "parse recharge config failed")
	} else {
		setupLog.Info("parse recharge config success", "activities", activities, "discountSteps", discountSteps, "discountRatios", discountRatios)
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
	if err = (accountReconciler).SetupWithManager(mgr, rateOpts); err != nil {
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
	debtController.Init()
	//if err = (&controllers.DebtReconciler{
	//	AccountReconciler:           accountReconciler,
	//	Client:                      mgr.GetClient(),
	//	Scheme:                      mgr.GetScheme(),
	//	AccountV2:                   v2Account,
	//	DebtUserMap:                 debtUserMap,
	//	InitUserAccountFunc:         accountReconciler.InitUserAccountFunc,
	//	SkipExpiredUserTimeDuration: skipExpiredUserTimeDuration,
	//}).SetupWithManager(mgr, rateOpts); err != nil {
	//	setupManagerError(err, "Debt")
	//}

	if err = cache.SetupCache(mgr); err != nil {
		setupLog.Error(err, "unable to cache controller")
		os.Exit(1)
	}
	_true := "true"
	if os.Getenv("DISABLE_WEBHOOKS") == _true {
		setupLog.Info("disable all webhooks")
	} else {
		mgr.GetWebhookServer().Register("/validate-v1-sealos-cloud", &webhook.Admission{Handler: &accountv1.DebtValidate{Client: mgr.GetClient(), AccountV2: v2Account, TTLUserMap: maps.New[*types.UsableBalanceWithCredits](env.GetIntEnvWithDefault("DEBT_WEBHOOK_CACHE_USER_TTL", 15))}})
	}

	err = dbClient.InitDefaultPropertyTypeLS()
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
	if err = billingReconciler.Init(); err != nil {
		setupLog.Error(err, "unable to init billing reconciler")
		os.Exit(1)
	}
	billingTaskRunner := &controllers.BillingTaskRunner{
		BillingReconciler: &billingReconciler,
	}
	if err := mgr.Add(billingTaskRunner); err != nil {
		setupLog.Error(err, "unable to add billing task runner")
		os.Exit(1)
	}
	if env.GetEnvWithDefault("SUPPORT_DEBT", _true) == _true {
		if err := mgr.Add(debtController); err != nil {
			setupLog.Error(err, "unable to add debt controller")
			os.Exit(1)
		}
	}

	if err = (&controllers.PodReconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr); err != nil {
		setupManagerError(err, "Pod")
	}
	if err = (&controllers.NamespaceReconciler{
		Client: watchClient,
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr, rateOpts); err != nil {
		setupManagerError(err, "Namespace")
	}

	if err = (&controllers.PaymentReconciler{
		Account:     accountReconciler,
		WatchClient: watchClient,
		Client:      mgr.GetClient(),
		Scheme:      mgr.GetScheme(),
	}).SetupWithManager(mgr); err != nil {
		setupManagerError(err, "Payment")
	}

	var userTrafficMonitor *controllers.UserTrafficMonitor
	if os.Getenv(controllers.EnvSubscriptionEnabled) == "true" && os.Getenv(database.TrafficMongoURI) != "" {
		trafficDBClient, err := mongo.NewMongoInterface(dbCtx, os.Getenv(database.TrafficMongoURI))
		if err != nil {
			setupLog.Error(err, "unable to connect to traffic mongo")
			os.Exit(1)
		}
		userTrafficCtrl := controllers.NewUserTrafficController(accountReconciler, trafficDBClient)
		go userTrafficCtrl.ProcessTrafficWithTimeRange()
		if env.GetEnvWithDefault("SUPPORT_MONITOR_USER_TRAFFIC", "false") == _true {
			userTrafficMonitor, err = controllers.NewUserTrafficMonitor(userTrafficCtrl)
			if err != nil {
				setupLog.Error(err, "unable to create user traffic monitor")
				os.Exit(1)
			}
			userTrafficMonitor.Start()
		}
	} else {
		setupLog.Info("skip user traffic controller")
	}
	defer func() {
		if userTrafficMonitor != nil {
			userTrafficMonitor.Stop()
		}
	}()

	//+kubebuilder:scaffold:builder

	if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up health check")
		os.Exit(1)
	}
	if err := mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up ready check")
		os.Exit(1)
	}

	if cvmDBClient != nil {
		cvmTaskRunner := &controllers.CVMTaskRunner{
			DBClient:          cvmDBClient,
			Logger:            ctrl.Log.WithName("CVMTaskRunner"),
			AccountReconciler: accountReconciler,
		}
		if err := mgr.Add(cvmTaskRunner); err != nil {
			setupLog.Error(err, "unable to add cvm task runner")
			os.Exit(1)
		}
	}
	//go func() {
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
	//}()

	setupLog.Info("starting manager")
	if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
		setupLog.Error(err, "fail to run manager")
		os.Exit(1)
	}
}
