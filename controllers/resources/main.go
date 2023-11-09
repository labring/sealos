/*
Copyright 2023 sealos.

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
	miniov1 "github/labring/sealos/controllers/minio/api/v1"
	"os"
	"time"

	"github.com/labring/sealos/controllers/pkg/database"

	"github.com/labring/sealos/controllers/pkg/resources"

	"github.com/labring/sealos/controllers/resources/controllers"

	// Import all Kubernetes client auth plugins (e.g. Azure, GCP, OIDC, etc.)
	// to ensure that exec-entrypoint and run can make use of them.
	_ "k8s.io/client-go/plugin/pkg/client/auth"

	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
	//+kubebuilder:scaffold:imports
)

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	//+kubebuilder:scaffold:scheme
}

func main() {
	var metricsAddr string
	var enableLeaderElection bool
	var probeAddr string
	flag.StringVar(&metricsAddr, "metrics-bind-address", ":8080", "The address the metric endpoint binds to.")
	flag.StringVar(&probeAddr, "health-probe-bind-address", ":8081", "The address the probe endpoint binds to.")
	flag.BoolVar(&enableLeaderElection, "leader-elect", false,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
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
		LeaderElectionID:       "a63686c3.sealos.io",
	})
	if err != nil {
		setupLog.Error(err, "unable to start manager")
		os.Exit(1)
	}

	//if err = (&controllers.MonitorReconciler{
	//	Client: mgr.GetClient(),
	//	Scheme: mgr.GetScheme(),
	//}).SetupWithManager(mgr); err != nil {
	//	setupLog.Error(err, "unable to create controller", "controller", "Monitor")
	//	os.Exit(1)
	//}

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
	//if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
	//	setupLog.Error(err, "problem running manager")
	//	os.Exit(1)
	//}
	go func() {
		if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
			setupLog.Error(err, "problem running manager")
			os.Exit(1)
		}
	}()

	reconciler, err := controllers.NewMonitorReconciler(mgr)
	if err != nil {
		setupLog.Error(err, "failed to init monitor reconciler")
		os.Exit(1)
	}
	reconciler.DBClient, err = database.NewMongoDB(context.Background(), os.Getenv(database.MongoURI))
	if err != nil {
		setupLog.Error(err, "failed to init db client")
		os.Exit(1)
	}
	defer func() {
		if err := reconciler.DBClient.Disconnect(context.Background()); err != nil {
			setupLog.Error(err, "failed to disconnect db client")
		}
	}()
	err = reconciler.DBClient.InitDefaultPropertyTypeLS()
	if err != nil {
		setupLog.Error(err, "failed to get property type")
		os.Exit(1)
	}
	reconciler.Properties = resources.DefaultPropertyTypeLS
	if reconciler.MinioClient, err = miniov1.NewMinioClient(os.Getenv("MINIO_ENDPOINT"), os.Getenv("MINIO_AK"), "MINIO_SK"); err != nil {
		reconciler.Logger.Error(err, "failed to new minio client")
	}
	// timer creates tomorrow's timing table in advance to ensure that tomorrow's table exists
	// Execute immediately and then every 24 hours.
	time.AfterFunc(time.Until(getNextMidnight()), func() {
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for {
			err := reconciler.DBClient.CreateMonitorTimeSeriesIfNotExist(time.Now().UTC().Add(24 * time.Hour))
			if err != nil {
				reconciler.Logger.Error(err, "failed to create monitor time series")
			}
			if err := reconciler.DropMonitorCollectionOlder(); err != nil {
				reconciler.Logger.Error(err, "failed to drop monitor collection")
			}
			<-ticker.C
		}
	})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := reconciler.StartReconciler(ctx); err != nil {
		setupLog.Error(err, "failed to start monitor reconciler")
		os.Exit(1)
	}
}

// getNextMidnight returns the next midnight time from now
func getNextMidnight() time.Time {
	now := time.Now().UTC()
	midnight := time.Date(now.Year(), now.Month(), now.Day(), 23, 0, 0, 0, time.UTC)
	return midnight
}
