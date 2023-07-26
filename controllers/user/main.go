/*
Copyright 2022 labring.

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

	utilcontroller "github.com/labring/operator-sdk/controller"

	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"

	// Import all Kubernetes client auth plugins (e.g. Azure, GCP, OIDC, etc.)
	// to ensure that exec-entrypoint and run can make use of them.
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers"
	//+kubebuilder:scaffold:imports
)

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))

	utilruntime.Must(userv1.AddToScheme(scheme))
	//+kubebuilder:scaffold:scheme
}

func main() {
	var (
		metricsAddr                string
		enableLeaderElection       bool
		probeAddr                  string
		rateLimiterOptions         utilcontroller.RateLimiterOptions
		syncPeriod                 time.Duration
		minRequeueDuration         time.Duration
		maxRequeueDuration         time.Duration
		operationReqExpirationTime time.Duration
		operationReqRetentionTime  time.Duration
	)
	flag.StringVar(&metricsAddr, "metrics-bind-address", ":8080", "The address the metric endpoint binds to.")
	flag.StringVar(&probeAddr, "health-probe-bind-address", ":8081", "The address the probe endpoint binds to.")
	flag.BoolVar(&enableLeaderElection, "leader-elect", false,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
	flag.DurationVar(&syncPeriod, "sync-period", time.Hour*24*30, "SyncPeriod determines the minimum frequency at which watched resources are reconciled.")
	flag.DurationVar(&minRequeueDuration, "min-requeue-duration", time.Hour*24, "The minimum duration between requeue options of a resource.")
	flag.DurationVar(&maxRequeueDuration, "max-requeue-duration", time.Hour*24*2, "The maximum duration between requeue options of a resource.")
	flag.DurationVar(&operationReqExpirationTime, "operation-req-expiration-time", time.Minute*3, "Sets the expiration time duration for an operation request. By default, the duration is set to 3 minutes.")
	flag.DurationVar(&operationReqRetentionTime, "operation-req-retention-time", time.Minute*3, "Sets the retention time duration for an operation request. By default, the duration is set to 3 minutes.")
	rateLimiterOptions.BindFlags(flag.CommandLine)
	opts := zap.Options{
		Development: true,
	}
	opts.BindFlags(flag.CommandLine)
	flag.Parse()

	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))

	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
		Scheme:                 scheme,
		MetricsBindAddress:     metricsAddr,
		Port:                   9443,
		HealthProbeBindAddress: probeAddr,
		LeaderElection:         enableLeaderElection,
		LeaderElectionID:       "785548a1.sealos.io",
		SyncPeriod:             &syncPeriod,
		// LeaderElectionReleaseOnCancel defines if the leader should step down voluntarily
		// when the Manager ends. This requires the binary to immediately end when the
		// Manager is stopped, otherwise, this setting is unsafe. Setting this significantly
		// speeds up voluntary leader transitions as the new leader don't have to wait
		// LeaseDuration time first.
		//
		// In the default scaffold provided, the program ends immediately after
		// the manager stops, so would be fine to enable this option. However,
		// if you are doing or is intended to do any operation such as perform cleanups
		// after the manager stops then its usage might be unsafe.
		// LeaderElectionReleaseOnCancel: true,
	})
	if err != nil {
		setupLog.Error(err, "unable to start manager")
		os.Exit(1)
	}
	if err = (&controllers.UserReconciler{}).SetupWithManager(mgr, rateLimiterOptions, minRequeueDuration, maxRequeueDuration); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "User")
		os.Exit(1)
	}

	if os.Getenv("DISABLE_WEBHOOKS") == "true" {
		setupLog.Info("disable all webhooks")
	} else {
		if err = (&userv1.User{}).SetupWebhookWithManager(mgr); err != nil {
			setupLog.Error(err, "unable to create webhook", "webhook", "User")
			os.Exit(1)
		}
	}

	if err = (&controllers.OperationReqReconciler{}).SetupWithManager(mgr, rateLimiterOptions, operationReqExpirationTime, operationReqRetentionTime); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "Operationrequest")
		os.Exit(1)
	}
	if err = (&userv1.Operationrequest{}).SetupWebhookWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create webhook", "webhook", "Operationrequest")
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
	ctx, cancel := context.WithCancel(context.TODO())
	defer cancel()
	setupLog.Info("starting manager")
	if err = mgr.Start(ctx); err != nil {
		setupLog.Error(err, "failed to running manager")
		os.Exit(1)
	}
}
