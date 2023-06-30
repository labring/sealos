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
	"flag"
	"os"
	"time"

	utilcontroller "github.com/labring/sealos/controllers/pkg/utils"
	"sigs.k8s.io/controller-runtime/pkg/controller"

	v1 "github.com/labring/sealos/controllers/common/notification/api/v1"
	"sigs.k8s.io/controller-runtime/pkg/webhook"

	"github.com/labring/sealos/controllers/account/controllers/cache"

	"sigs.k8s.io/controller-runtime/pkg/client"

	meteringcommonv1 "github.com/labring/sealos/controllers/common/metering/api/v1"

	"github.com/labring/sealos/controllers/account/controllers"

	// Import all Kubernetes client auth plugins (e.g. Azure, GCP, OIDC, etc.)
	// to ensure that exec-entrypoint and run can make use of them.
	_ "k8s.io/client-go/plugin/pkg/client/auth"

	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
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
	utilruntime.Must(meteringcommonv1.AddToScheme(scheme))
	utilruntime.Must(v1.AddToScheme(scheme))
	//+kubebuilder:scaffold:scheme
}

func main() {
	var (
		metricsAddr          string
		enableLeaderElection bool
		probeAddr            string
		concurrent           int
		rateLimiterOptions   utilcontroller.RateLimiterOptions
		leaseDuration        time.Duration
		renewDeadline        time.Duration
		retryPeriod          time.Duration
	)
	flag.StringVar(&metricsAddr, "metrics-bind-address", ":8080", "The address the metric endpoint binds to.")
	flag.StringVar(&probeAddr, "health-probe-bind-address", ":8081", "The address the probe endpoint binds to.")
	flag.BoolVar(&enableLeaderElection, "leader-elect", false,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
	flag.IntVar(&concurrent, "concurrent", 5, "The number of concurrent cluster reconciles.")
	flag.DurationVar(&leaseDuration, "leader-elect-lease-duration", 60*time.Second, "Duration that non-leader candidates will wait to force acquire leadership.")
	flag.DurationVar(&renewDeadline, "leader-elect-renew-deadline", 40*time.Second, "Duration the acting master will retry refreshing leadership before giving up.")
	flag.DurationVar(&retryPeriod, "leader-elect-retry-period", 5*time.Second, "Duration the LeaderElector clients should wait between tries of actions.")
	opts := zap.Options{
		Development: true,
	}
	rateLimiterOptions.BindFlags(flag.CommandLine)
	opts.BindFlags(flag.CommandLine)
	flag.Parse()

	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))

	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
		Scheme:                 scheme,
		MetricsBindAddress:     metricsAddr,
		Port:                   9443,
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
		RateLimiter:             utilcontroller.GetRateLimiter(rateLimiterOptions),
	}
	if err = (&controllers.AccountReconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr, rateOpts); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "Account")
		os.Exit(1)
	}
	if err = (&controllers.PaymentReconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr, rateOpts); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "Payment")
		os.Exit(1)
	}
	if err = (&controllers.DebtReconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr, rateOpts); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "Debt")
		os.Exit(1)
	}

	if err = cache.SetupCache(mgr); err != nil {
		setupLog.Error(err, "unable to cache controller")
		os.Exit(1)
	}
	if os.Getenv("DISABLE_WEBHOOKS") == "true" {
		setupLog.Info("disable all webhooks")
	} else {
		mgr.GetWebhookServer().Register("/validate-v1-sealos-cloud", &webhook.Admission{Handler: &accountv1.DebtValidate{Client: mgr.GetClient()}})
	}

	if err = (&controllers.BillingRecordQueryReconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr, rateOpts); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "BillingRecordQuery")
		os.Exit(1)
	}
	if err = (&controllers.BillingReconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr, rateOpts); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "Billing")
		os.Exit(1)
	}

	if err = (&controllers.PodReconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "Pod")
		os.Exit(1)
	}
	if err = (&controllers.NamespaceReconciler{
		Client: watchClient,
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "Namespace")
		os.Exit(1)
	}
	if err = (&controllers.TransferReconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "Transfer")
		os.Exit(1)
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

	setupLog.Info("starting manager")
	if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
		setupLog.Error(err, "fail to run manager")
		os.Exit(1)
	}
}
