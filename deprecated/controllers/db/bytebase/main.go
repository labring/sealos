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

	// Import all Kubernetes client auth plugins (e.g. Azure, GCP, OIDC, etc.)
	// to ensure that exec-entrypoint and run can make use of them.
	_ "k8s.io/client-go/plugin/pkg/client/auth"

	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"

	bytebasev1 "github.com/labring/sealos/controllers/db/bytebase/apis/bytebase/v1"
	configv1 "github.com/labring/sealos/controllers/db/bytebase/apis/config/v1"
	bytebasecontrollers "github.com/labring/sealos/controllers/db/bytebase/controllers/bytebase"
	//+kubebuilder:scaffold:imports
)

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
)

const (
	DefaultRootDomain      = "cloud.sealos.io"
	DefaultSecretName      = "wildcard-cloud-sealos-io-cert"
	DefaultSecretNamespace = "sealos-system"
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	utilruntime.Must(configv1.AddToScheme(scheme))
	utilruntime.Must(bytebasev1.AddToScheme(scheme))
	//+kubebuilder:scaffold:scheme
}

// The following method return the default value from both the code and the environment variable
func getDefaultRootDomain() string {
	rootDomain := os.Getenv("ROOT_DOMAIN")
	if rootDomain == "" {
		return DefaultRootDomain
	}
	return rootDomain
}

func getDefaultSecretName() string {
	secretName := os.Getenv("SECRET_NAME")
	if secretName == "" {
		return DefaultSecretName
	}
	return secretName
}

func getDefaultSecretNamespace() string {
	secretNamespace := os.Getenv("SECRET_NAMESPACE")
	if secretNamespace == "" {
		return DefaultSecretNamespace
	}
	return secretNamespace
}

func main() {
	// init the flags
	var configFile string
	var metricsAddr string
	var enableLeaderElection bool
	var probeAddr string
	var debug bool
	flag.StringVar(&configFile, "config", "", "The controller will load its initial configuration from this file. "+"Omit this flag to use the default configuration values. "+"Command-line flags override configuration from this file.")
	flag.StringVar(&metricsAddr, "metrics-bind-address", ":8080", "The address the metric endpoint binds to.")
	flag.StringVar(&probeAddr, "health-probe-bind-address", ":8081", "The address the probe endpoint binds to.")
	flag.BoolVar(&enableLeaderElection, "leader-elect", false,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
	flag.BoolVar(&debug, "debug", false, "manager debug mode.")
	opts := zap.Options{
		Development: true,
	}
	opts.BindFlags(flag.CommandLine)
	flag.Parse()
	// set up manager options
	options := ctrl.Options{
		Scheme:                 scheme,
		MetricsBindAddress:     metricsAddr,
		Port:                   9443,
		HealthProbeBindAddress: probeAddr,
		LeaderElection:         enableLeaderElection,
		LeaderElectionID:       "043ebde6.db.sealos.io",
	}
	// read the config file

	ctrlConfig := configv1.BytebaseControllerConfig{}
	if configFile != "" {
		// AndFrom will use a supplied type and convert to Options any options already set on Options will be ignored, this is used to allow cli flags to override anything specified in the config file.
		var err error
		options, err = options.AndFrom(ctrl.ConfigFile().AtPath(configFile).OfKind(&ctrlConfig))
		// options, err = options.AndFrom(ctrl.ConfigFile().AtPath(configFile))
		if err != nil {
			setupLog.Error(err, "unable to load the config file")
			os.Exit(1)
		}
	}
	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))

	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), options)
	if err != nil {
		setupLog.Error(err, "unable to start manager")
		os.Exit(1)
	}

	// init configuration for the reconciler
	rootDomain := ctrlConfig.RootDomain
	if rootDomain == "" {
		rootDomain = getDefaultRootDomain()
	}
	secretName := ctrlConfig.SecretName
	if secretName == "" {
		secretName = getDefaultSecretName()
	}
	secretNameSpace := ctrlConfig.SecretNamespace
	if secretNameSpace == "" {
		secretNameSpace = getDefaultSecretNamespace()
	}
	if debug || ctrlConfig.Debug {
		setupLog.Info("configuration values...", "rootDomain", rootDomain, "secretName", secretName, "secretNameSpace", secretNameSpace)
	}

	if err = (&bytebasecontrollers.Reconciler{
		Client: mgr.GetClient(),
		Scheme: mgr.GetScheme(),
		// use the logger with name
		Logger: ctrl.Log.WithName("controllers").WithName("Bytebase"),
		// Logger: mgr.GetLogger(),
		Config:          mgr.GetConfig(),
		Recorder:        mgr.GetEventRecorderFor("sealos-bytebase-controller"),
		SecretName:      secretName,
		SecretNamespace: secretNameSpace,
		RootDomain:      rootDomain,
	}).SetupWithManager(mgr); err != nil {
		setupLog.Error(err, "unable to create controller", "controller", "Bytebase")
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
		setupLog.Error(err, "problem running manager")
		os.Exit(1)
	}
}
