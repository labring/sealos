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

	"github.com/labring/sealos/controllers/account/controllers/cache"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/database/mongo"
	notificationv1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils/env"
	rate "github.com/labring/sealos/controllers/pkg/utils/rate"
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
		rateLimiterOptions   rate.LimiterOptions
		leaseDuration        time.Duration
		renewDeadline        time.Duration
		retryPeriod          time.Duration
	)
	flag.StringVar(&metricsAddr, "metrics-bind-address", ":8080", "The address the metric endpoint binds to.")
	flag.StringVar(&probeAddr, "health-probe-bind-address", ":8081", "The address the probe endpoint binds to.")
	flag.BoolVar(&development, "development", false, "Enable development mode.")
	flag.BoolVar(&enableLeaderElection, "leader-elect", false,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
	flag.IntVar(&concurrent, "concurrent", 5, "The number of concurrent cluster reconciles.")
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
		RateLimiter:             rate.GetRateLimiter(rateLimiterOptions),
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
	accountReconciler := &controllers.AccountReconciler{
		Client:      mgr.GetClient(),
		Scheme:      mgr.GetScheme(),
		DBClient:    dbClient,
		AccountV2:   v2Account,
		CVMDBClient: cvmDBClient,
	}
	billingInfoQueryReconciler := &controllers.BillingInfoQueryReconciler{
		Client:     mgr.GetClient(),
		Scheme:     mgr.GetScheme(),
		DBClient:   dbClient,
		Properties: resources.DefaultPropertyTypeLS,
		AccountV2:  v2Account,
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
		billingInfoQueryReconciler.Activities = activities
		billingInfoQueryReconciler.DefaultDiscount = types.RechargeDiscount{
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
	if err = (&controllers.PaymentReconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr, rateOpts); err != nil {
		setupManagerError(err, "Payment")
	}
	if err = (&controllers.DebtReconciler{
		Client:    mgr.GetClient(),
		Scheme:    mgr.GetScheme(),
		AccountV2: v2Account,
	}).SetupWithManager(mgr, rateOpts); err != nil {
		setupManagerError(err, "Debt")
	}

	if err = cache.SetupCache(mgr); err != nil {
		setupLog.Error(err, "unable to cache controller")
		os.Exit(1)
	}
	if os.Getenv("DISABLE_WEBHOOKS") == "true" {
		setupLog.Info("disable all webhooks")
	} else {
		mgr.GetWebhookServer().Register("/validate-v1-sealos-cloud", &webhook.Admission{Handler: &accountv1.DebtValidate{Client: mgr.GetClient(), AccountV2: v2Account}})
	}

	err = dbClient.InitDefaultPropertyTypeLS()
	if err != nil {
		setupLog.Error(err, "unable to get property type")
		os.Exit(1)
	}

	if err = (&controllers.BillingRecordQueryReconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr, rateOpts); err != nil {
		setupManagerError(err, "BillingRecordQuery")
	}
	if err = (&controllers.BillingReconciler{
		DBClient:   dbClient,
		Properties: resources.DefaultPropertyTypeLS,
		Client:     mgr.GetClient(),
		Scheme:     mgr.GetScheme(),
		AccountV2:  v2Account,
	}).SetupWithManager(mgr, rateOpts); err != nil {
		setupManagerError(err, "Billing")
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
	}).SetupWithManager(mgr); err != nil {
		setupManagerError(err, "Namespace")
	}
	if err = (&controllers.NamespaceBillingHistoryReconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr); err != nil {
		setupManagerError(err, "NamespaceBillingHistory")
	}
	billingInfoQueryReconciler.AccountSystemNamespace = accountReconciler.AccountSystemNamespace
	if err = (billingInfoQueryReconciler).SetupWithManager(mgr); err != nil {
		setupManagerError(err, "BillingInfoQuery")
	}
	//+kubebuilder:scaffold:builder

	if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up health check")
		os.Exit(1)
	}
	if err := mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
		setupLog.Error(err, "unable to set up ready check")
		os.Exit(1)
	}

	go func() {
		if cvmDBClient == nil {
			setupLog.Info("CVM DB client is nil, skip billing cvm")
			return
		}
		ticker := time.NewTicker(env.GetDurationEnvWithDefault("BILLING_CVM_INTERVAL", 10*time.Minute))
		defer ticker.Stop()
		for {
			setupLog.Info("start billing cvm", "time", time.Now().Format(time.RFC3339))
			err := accountReconciler.BillingCVM()
			if err != nil {
				setupLog.Error(err, "fail to billing cvm")
			}
			setupLog.Info("end billing cvm", "time", time.Now().Format(time.RFC3339))
			<-ticker.C
		}
	}()

	setupLog.Info("starting manager")
	if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
		setupLog.Error(err, "fail to run manager")
		os.Exit(1)
	}
}
