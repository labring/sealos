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
	"crypto/tls"
	"flag"
	"os"
	"time"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers"
	ratelimiter "github.com/labring/sealos/controllers/user/controllers/helper/ratelimiter"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	// Import all Kubernetes client auth plugins (e.g. Azure, GCP, OIDC, etc.)
	// to ensure that exec-entrypoint and run can make use of them.
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	"k8s.io/utils/ptr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/config"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
	"sigs.k8s.io/controller-runtime/pkg/metrics/filters"
	//+kubebuilder:scaffold:imports
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
)

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))

	utilruntime.Must(licensev1.AddToScheme(scheme))
	utilruntime.Must(userv1.AddToScheme(scheme))
	//+kubebuilder:scaffold:scheme
}

func main() {
	var (
		metricsAddr                string
		enableLeaderElection       bool
		probeAddr                  string
		configFilePath             string
		rateLimiterOptions         ratelimiter.RateLimiterOptions
		syncPeriod                 time.Duration
		minRequeueDuration         time.Duration
		maxRequeueDuration         time.Duration
		operationReqExpirationTime time.Duration
		restartPredicateDuration   time.Duration
		operationReqRetentionTime  time.Duration
		secureMetrics              bool
		enableHTTP2                bool
		tlsOpts                    []func(*tls.Config)
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
	flag.BoolVar(&enableLeaderElection, "leader-elect", false,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
	flag.DurationVar(
		&syncPeriod,
		"sync-period",
		time.Hour*24*30,
		"SyncPeriod determines the minimum frequency at which watched resources are reconciled.",
	)
	flag.DurationVar(
		&minRequeueDuration,
		"min-requeue-duration",
		time.Hour*24,
		"The minimum duration between requeue options of a resource.",
	)
	flag.DurationVar(
		&maxRequeueDuration,
		"max-requeue-duration",
		time.Hour*24*2,
		"The maximum duration between requeue options of a resource.",
	)
	flag.DurationVar(
		&operationReqExpirationTime,
		"operation-req-expiration-time",
		time.Minute*3,
		"Sets the expiration time duration for an operation request. By default, the duration is set to 3 minutes.",
	)
	flag.DurationVar(
		&operationReqRetentionTime,
		"operation-req-retention-time",
		time.Minute*3,
		"Sets the retention time duration for an operation request. By default, the duration is set to 3 minutes.",
	)
	flag.DurationVar(
		&restartPredicateDuration,
		"restart-predicate-time",
		time.Hour*2,
		"Sets the restrat predicate time duration for user controller restart. By default, the duration is set to 2 hours.",
	)
	flag.StringVar(
		&configFilePath,
		"config-file-path",
		"/config.yaml",
		"The path to the configuration file.",
	)
	flag.BoolVar(
		&secureMetrics,
		"metrics-secure",
		true,
		"If set, the metrics endpoint is served securely via HTTPS. Use --metrics-secure=false to use HTTP instead.",
	)
	flag.BoolVar(&enableHTTP2, "enable-http2", false,
		"If set, HTTP/2 will be enabled for the metrics and webhook servers")
	rateLimiterOptions.BindFlags(flag.CommandLine)
	opts := zap.Options{
		Development: true,
	}
	opts.BindFlags(flag.CommandLine)
	flag.Parse()

	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))

	// if the enable-http2 flag is false (the default), http/2 should be disabled
	// due to its vulnerabilities. More specifically, disabling http/2 will
	// prevent from being vulnerable to the HTTP/2 Stream Cancellation and
	// Rapid Reset CVEs. For more information see:
	// - https://github.com/advisories/GHSA-qppj-fm5r-hxr3
	// - https://github.com/advisories/GHSA-4374-p667-p6c8
	disableHTTP2 := func(c *tls.Config) {
		setupLog.Info("disabling http/2")
		c.NextProtos = []string{"http/1.1"}
	}

	if !enableHTTP2 {
		tlsOpts = append(tlsOpts, disableHTTP2)
	}
	// Metrics endpoint is enabled in 'config/default/kustomization.yaml'. The Metrics options configure the server.
	// More info:
	// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.19.1/pkg/metrics/server
	// - https://book.kubebuilder.io/reference/metrics.html
	metricsServerOptions := metricsserver.Options{
		BindAddress:   metricsAddr,
		SecureServing: secureMetrics,
		TLSOpts:       tlsOpts,
	}

	if secureMetrics {
		// FilterProvider is used to protect the metrics endpoint with authn/authz.
		// These configurations ensure that only authorized users and service accounts
		// can access the metrics endpoint. The RBAC are configured in 'config/rbac/kustomization.yaml'. More info:
		// https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.19.1/pkg/metrics/filters#WithAuthenticationAndAuthorization
		metricsServerOptions.FilterProvider = filters.WithAuthenticationAndAuthorization

		// TODO(user): If CertDir, CertName, and KeyName are not specified, controller-runtime will automatically
		// generate self-signed certificates for the metrics server. While convenient for development and testing,
		// this setup is not recommended for production.
	}

	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
		Scheme:  scheme,
		Metrics: metricsServerOptions,
		// WebhookServer: webhook.NewServer(webhook.Options{
		//	Port: 9443,
		// }),
		HealthProbeBindAddress: probeAddr,
		LeaderElection:         enableLeaderElection,
		LeaderElectionID:       "785548a1.sealos.io",
		Cache: cache.Options{
			SyncPeriod: &syncPeriod,
		},
		Controller: config.Controller{
			UsePriorityQueue: ptr.To(true),
		},
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

	if err := controllers.SetupLicenseGate(mgr); err != nil {
		setupLog.Error(err, "unable to set up license gate")
		os.Exit(1)
	}
	if err := controllers.SetupUserCount(mgr); err != nil {
		setupLog.Error(err, "unable to set up user count")
		os.Exit(1)
	}

	if err = (&controllers.UserReconciler{}).SetupWithManager(mgr, rateLimiterOptions, minRequeueDuration, maxRequeueDuration, restartPredicateDuration); err != nil {
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
	if err = (&controllers.DeleteRequestReconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "DeleteRequest")
		os.Exit(1)
	}
	// if err = (&controllers.AdaptRoleBindingReconciler{
	// 	Client: mgr.GetClient(),
	// 	Scheme: mgr.GetScheme(),
	// }).SetupWithManager(mgr); err != nil {
	// 	setupLog.Error(err, "unable to create controller", "controller", "AdaptRoleBinding")
	// 	os.Exit(1)
	// }
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
