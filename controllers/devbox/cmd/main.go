/*
Copyright 2024.

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

	// Import all Kubernetes client auth plugins (e.g. Azure, GCP, OIDC, etc.)
	// to ensure that exec-entrypoint and run can make use of them.
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/record"
	"k8s.io/utils/ptr"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	ctrlconfig "sigs.k8s.io/controller-runtime/pkg/config"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
	"sigs.k8s.io/controller-runtime/pkg/metrics/filters"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
	"sigs.k8s.io/controller-runtime/pkg/webhook"

	devboxv1alpha2 "github.com/labring/sealos/controllers/devbox/api/v1alpha2"
	"github.com/labring/sealos/controllers/devbox/internal/commit"
	"github.com/labring/sealos/controllers/devbox/internal/controller"
	"github.com/labring/sealos/controllers/devbox/internal/controller/utils/matcher"
	"github.com/labring/sealos/controllers/devbox/internal/controller/utils/nodes"
	utilresource "github.com/labring/sealos/controllers/devbox/internal/controller/utils/resource"
	"github.com/labring/sealos/controllers/devbox/internal/stat"
	// +kubebuilder:scaffold:imports
)

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	utilruntime.Must(devboxv1alpha2.AddToScheme(scheme))
	// +kubebuilder:scaffold:scheme
}

func main() {
	var metricsAddr string
	var probeAddr string
	var secureMetrics bool
	var enableHTTP2 bool
	var tlsOpts []func(*tls.Config)
	// debug flag
	var debugMode bool
	// registry flag
	var registryAddr string
	var registryUser string
	var registryPassword string
	// resource flag
	var requestCPURate float64
	var requestMemoryRate float64
	var requestEphemeralStorage string
	var limitEphemeralStorage string
	var maximumLimitEphemeralStorage string
	// pod matcher flag
	var enablePodResourceMatcher bool
	var enablePodEnvMatcher bool
	var enablePodPortMatcher bool
	var enablePodEphemeralStorageMatcher bool
	var enablePodStorageLimitMatcher bool
	// config qps and burst
	var configQPS int
	var configBurst int
	// config restart predicate duration
	var restartPredicateDuration time.Duration
	// devbox node label
	var devboxNodeLabel string
	var acceptanceThreshold int
	flag.StringVar(&metricsAddr, "metrics-bind-address", "0", "The address the metrics endpoint binds to. "+
		"Use :8443 for HTTPS or :8080 for HTTP, or leave as 0 to disable the metrics service.")
	flag.StringVar(&probeAddr, "health-probe-bind-address", ":8081", "The address the probe endpoint binds to.")
	flag.BoolVar(&secureMetrics, "metrics-secure", true,
		"If set, the metrics endpoint is served securely via HTTPS. Use --metrics-secure=false to use HTTP instead.")
	flag.BoolVar(&enableHTTP2, "enable-http2", false,
		"If set, HTTP/2 will be enabled for the metrics and webhook servers")
	// debug flag
	flag.BoolVar(&debugMode, "debug", false, "If set, debug mode will be enabled")
	// registry flag
	flag.StringVar(&registryAddr, "registry-addr", "sealos.hub:5000", "The address of the registry")
	flag.StringVar(&registryUser, "registry-user", "admin", "The user of the registry")
	flag.StringVar(&registryPassword, "registry-password", "passw0rd", "The password of the registry")
	// resource flag
	flag.Float64Var(&requestCPURate, "request-cpu-rate", 10, "The request rate of cpu limit in devbox.")
	flag.Float64Var(&requestMemoryRate, "request-memory-rate", 10, "The request rate of memory limit in devbox.")
	flag.StringVar(&requestEphemeralStorage, "request-ephemeral-storage", "500Mi", "The default request value of ephemeral storage in devbox.")
	flag.StringVar(&limitEphemeralStorage, "limit-ephemeral-storage", "10Gi", "The default limit value of ephemeral storage in devbox.")
	flag.StringVar(&maximumLimitEphemeralStorage, "maximum-limit-ephemeral-storage", "50Gi", "The maximum limit value of ephemeral storage in devbox.")
	// pod matcher flag, pod resource matcher, env matcher, port matcher will be enabled by default, ephemeral storage matcher will be disabled by default
	flag.BoolVar(&enablePodResourceMatcher, "enable-pod-resource-matcher", true, "If set, pod resource matcher will be enabled")
	flag.BoolVar(&enablePodEnvMatcher, "enable-pod-env-matcher", true, "If set, pod env matcher will be enabled")
	flag.BoolVar(&enablePodPortMatcher, "enable-pod-port-matcher", true, "If set, pod port matcher will be enabled")
	flag.BoolVar(&enablePodEphemeralStorageMatcher, "enable-pod-ephemeral-storage-matcher", false, "If set, pod ephemeral storage matcher will be enabled")
	flag.BoolVar(&enablePodStorageLimitMatcher, "enable-pod-storage-limit-matcher", false, "If set, pod storage limit matcher will be enabled")
	// config qps and burst
	flag.IntVar(&configQPS, "config-qps", 50, "The qps of the config")
	flag.IntVar(&configBurst, "config-burst", 100, "The burst of the config")
	// config restart predicate duration
	flag.DurationVar(&restartPredicateDuration, "restart-predicate-duration", 2*time.Hour, "Sets the restart predicate time duration for devbox controller restart. By default, the duration is set to 2 hours.")
	// devbox node label
	flag.StringVar(&devboxNodeLabel, "devbox-node-label", "devbox.sealos.io/node", "The label of the devbox node")
	// scheduling flags
	flag.IntVar(&acceptanceThreshold, "acceptance-threshold", 16, "The minimum acceptance score for scheduling devbox to node. Default is 16, which means the node must have enough resources to run the devbox.")
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

	webhookServer := webhook.NewServer(webhook.Options{
		TLSOpts: tlsOpts,
	})

	// Metrics endpoint is enabled in 'config/default/kustomization.yaml'. The Metrics options configure the server.
	// More info:
	// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.18.4/pkg/metrics/server
	// - https://book.kubebuilder.io/reference/metrics.html
	metricsServerOptions := metricsserver.Options{
		BindAddress:   metricsAddr,
		SecureServing: secureMetrics,
		// TODO(user): TLSOpts is used to allow configuring the TLS config used for the server. If certificates are
		// not provided, self-signed certificates will be generated by default. This option is not recommended for
		// production environments as self-signed certificates do not offer the same level of trust and security
		// as certificates issued by a trusted Certificate Authority (CA). The primary risk is potentially allowing
		// unauthorized access to sensitive metrics data. Consider replacing with CertDir, CertName, and KeyName
		// to provide certificates, ensuring the server communicates using trusted and secure certificates.
		TLSOpts: tlsOpts,
	}

	if secureMetrics {
		// FilterProvider is used to protect the metrics endpoint with authn/authz.
		// These configurations ensure that only authorized users and service accounts
		// can access the metrics endpoint. The RBAC are configured in 'config/rbac/kustomization.yaml'. More info:
		// https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.18.4/pkg/metrics/filters#WithAuthenticationAndAuthorization
		metricsServerOptions.FilterProvider = filters.WithAuthenticationAndAuthorization
	}

	cacheObjLabelSelector := labels.SelectorFromSet(map[string]string{
		"app.kubernetes.io/managed-by": "sealos",
		"app.kubernetes.io/part-of":    "devbox",
	})

	config := ctrl.GetConfigOrDie()
	// set qps and burst to config qps and burst for kube-config
	config.QPS = float32(configQPS)
	config.Burst = configBurst

	mgr, err := ctrl.NewManager(config, ctrl.Options{
		Scheme:                 scheme,
		Metrics:                metricsServerOptions,
		WebhookServer:          webhookServer,
		HealthProbeBindAddress: probeAddr,
		LeaderElection:         false,
		// LeaderElectionID:       "b6694722.sealos.io",
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

		NewCache: func(config *rest.Config, opts cache.Options) (cache.Cache, error) {
			opts.ByObject = map[client.Object]cache.ByObject{
				&corev1.Service{}: {Label: cacheObjLabelSelector},
				&corev1.Pod{}:     {Label: cacheObjLabelSelector},
				&corev1.Secret{}:  {Label: cacheObjLabelSelector},
			}
			return cache.New(config, opts)
		},
		Controller: ctrlconfig.Controller{
			UsePriorityQueue: ptr.To(true),
		},
	})
	if err != nil {
		setupLog.Error(err, "unable to start manager")
		os.Exit(1)
	}

	podMatchers := []matcher.PodMatcher{}
	if enablePodResourceMatcher {
		podMatchers = append(podMatchers, matcher.ResourceMatcher{})
	}
	if enablePodEnvMatcher {
		podMatchers = append(podMatchers, matcher.EnvVarMatcher{})
	}
	if enablePodPortMatcher {
		podMatchers = append(podMatchers, matcher.PortMatcher{})
	}
	if enablePodEphemeralStorageMatcher {
		podMatchers = append(podMatchers, matcher.EphemeralStorageMatcher{})
	}
	if enablePodStorageLimitMatcher {
		podMatchers = append(podMatchers, matcher.StorageLimitMatcher{})
	}

	stateChangeBroadcaster := record.NewBroadcaster()

	if err = (&controller.DevboxReconciler{
		Client:   mgr.GetClient(),
		Scheme:   mgr.GetScheme(),
		Recorder: mgr.GetEventRecorderFor("devbox-controller"),
		StateChangeRecorder: stateChangeBroadcaster.NewRecorder(
			mgr.GetScheme(),
			corev1.EventSource{Component: "devbox-controller", Host: nodes.GetNodeName()}),
		CommitImageRegistry: registryAddr,
		RequestRate: utilresource.RequestRate{
			CPU:    requestCPURate,
			Memory: requestMemoryRate,
		},
		EphemeralStorage: utilresource.EphemeralStorage{
			DefaultRequest: resource.MustParse(requestEphemeralStorage),
			DefaultLimit:   resource.MustParse(limitEphemeralStorage),
			MaximumLimit:   resource.MustParse(maximumLimitEphemeralStorage),
		},
		PodMatchers:              podMatchers,
		DebugMode:                debugMode,
		RestartPredicateDuration: restartPredicateDuration,
		NodeName:                 nodes.GetNodeName(),
		AcceptanceThreshold:      acceptanceThreshold,
		NodeStatsProvider:        &stat.NodeStatsProviderImpl{},
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "Devbox")
		os.Exit(1)
	}

	committer, err := commit.NewCommitter(registryAddr, registryUser, registryPassword)
	if err != nil {
		setupLog.Error(err, "unable to create committer")
		os.Exit(1)
	}

	if err := committer.InitializeGC(context.Background()); err != nil {
		setupLog.Error(err, "unable to initialize GC")
		os.Exit(1)
	}

	stateChangeHandler := controller.StateChangeHandler{
		Client:              mgr.GetClient(),
		Scheme:              mgr.GetScheme(),
		Recorder:            mgr.GetEventRecorderFor("state-change-handler"),
		Committer:           committer,
		CommitImageRegistry: registryAddr,
		NodeName:            nodes.GetNodeName(),
		Logger:              ctrl.Log.WithName("state-change-handler"),
	}

	// 添加调试日志
	setupLog.Info("StateChangeHandler initialized",
		"nodeName", nodes.GetNodeName(),
		"registryAddr", registryAddr)

	watcher := stateChangeBroadcaster.StartEventWatcher(func(event *corev1.Event) {
		setupLog.Info("Event received by watcher",
			"event", event.Name,
			"eventSourceHost", event.Source.Host,
			"eventType", event.Type,
			"eventReason", event.Reason)
		stateChangeHandler.Handle(context.Background(), event)
	})
	defer watcher.Stop()

	if err = (&controller.DevboxreleaseReconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "Devboxrelease")
		os.Exit(1)
	}
	// +kubebuilder:scaffold:builder

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
		setupLog.Error(err, "problem running manager")
		os.Exit(1)
	}
}
