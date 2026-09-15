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
	"errors"
	"flag"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/apecloud/kubeblocks/apis/dataprotection/v1alpha1"
	appv1 "github.com/labring/sealos/controllers/app/api/v1"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/database/mongo"
	"github.com/labring/sealos/controllers/pkg/objectstorage"
	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/controllers/pkg/utils/env"
	"github.com/labring/sealos/controllers/resources/controllers"
	resourcecache "github.com/labring/sealos/controllers/resources/controllers/cache"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
	"sigs.k8s.io/controller-runtime/pkg/manager"
	metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"
)

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
)

func init() {
	utilruntime.Must(clientgoscheme.AddToScheme(scheme))
	utilruntime.Must(appv1.AddToScheme(scheme))
	utilruntime.Must(v1alpha1.AddToScheme(scheme))
	//+kubebuilder:scaffold:scheme
}

func main() {
	var metricsAddr string
	var enableLeaderElection bool
	var probeAddr string
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
	opts := zap.Options{
		Development: true,
	}
	opts.BindFlags(flag.CommandLine)
	flag.Parse()

	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))

	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
		Scheme: scheme,
		Cache:  resourcecache.Options(),
		Client: client.Options{Cache: &client.CacheOptions{
			DisableFor: resourcecache.UncachedObjects(),
		}},
		Metrics: metricsserver.Options{
			BindAddress: metricsAddr,
		},
		HealthProbeBindAddress: probeAddr,
		LeaderElection:         enableLeaderElection,
		LeaderElectionID:       "a63686c3.sealos.io",
	})
	if err != nil {
		setupLog.Error(err, "unable to start manager")
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

	if err = resourcecache.SetupInformers(mgr); err != nil {
		setupLog.Error(err, "failed to set up resource cache informers")
		os.Exit(1)
	}
	err = controllers.InitIndexField(mgr)
	if err != nil {
		setupLog.Error(err, "failed to init index field")
		os.Exit(1)
	}
	// if env.GetBoolWithDefault("ENABLE_AUTO_RESOURCE_QUOTA", false) {
	//	if err = (&controllers.NamespaceQuotaReconciler{
	//		Client:   mgr.GetClient(),
	//		Scheme:   mgr.GetScheme(),
	//		Recorder: mgr.GetEventRecorderFor("namespace-quota-controller"),
	//	}).SetupWithManager(mgr); err != nil {
	//		setupLog.Error(err, "unable to create controller", "controller", "NamespaceQuota")
	//		os.Exit(1)
	//	}
	//}
	// if err = (&controllers.NetworkReconciler{}).SetupWithManager(mgr); err != nil {
	//	setupLog.Error(err, "unable to create controller", "controller", "Network")
	//	os.Exit(1)
	//}

	if err := mgr.Add(monitorRunnable{RunnableFunc: func(ctx context.Context) error {
		return runMonitor(ctx, mgr)
	}}); err != nil {
		setupLog.Error(err, "unable to register monitor")
		os.Exit(1)
	}
	if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
		setupLog.Error(err, "problem running manager")
		os.Exit(1)
	}
}

type monitorRunnable struct {
	manager.RunnableFunc
}

func (monitorRunnable) NeedLeaderElection() bool { return true }

func runMonitor(ctx context.Context, mgr ctrl.Manager) error {
	// ReaderFailOnMissingInformer skips the per-read sync wait, so synchronize all
	// explicitly registered informers before the monitor performs its first read.
	if !mgr.GetCache().WaitForCacheSync(ctx) {
		if ctx.Err() != nil {
			return nil
		}
		return errors.New("resource cache sync did not complete")
	}
	if ctx.Err() != nil {
		return nil
	}
	setupLog.Info("starting leader monitor")
	defer setupLog.Info("stopped leader monitor")

	reconciler, err := controllers.NewMonitorReconciler(mgr)
	if err != nil {
		return fmt.Errorf("initialize monitor reconciler: %w", err)
	}
	reconciler.DBClient, err = mongo.NewMongoInterface(
		ctx,
		os.Getenv(database.MongoURI),
	)
	if reconciler.DBClient != nil {
		defer disconnectMonitorDatabase(reconciler.DBClient)
	}
	if err != nil {
		return monitorInitializationError(ctx, "initialize monitor database", err)
	}
	if trafficURI := os.Getenv(database.TrafficMongoURI); trafficURI != "" {
		reconciler.TrafficClient, err = mongo.NewMongoInterface(ctx, trafficURI)
		if reconciler.TrafficClient != nil {
			defer disconnectMonitorDatabase(reconciler.TrafficClient)
		}
		if err != nil {
			return monitorInitializationError(ctx, "initialize traffic database", err)
		}
	} else {
		setupLog.Info("traffic mongo uri not found, please check env: TRAFFIC_MONGO_URI")
	}

	err = reconciler.DBClient.InitDefaultPropertyTypeLSWithDefaults()
	if err != nil {
		return fmt.Errorf("initialize property types: %w", err)
	}
	reconciler.Properties = resources.DefaultPropertyTypeLS
	const (
		MinioEndpoint          = "MINIO_ENDPOINT"
		MinioAk                = "MINIO_AK"
		MinioSk                = "MINIO_SK"
		PromURL                = "PROM_URL"
		MinioMetricsAddr       = "MINIO_METRICS_ADDR"
		MinioMetricsAddrSecure = "MINIO_METRICS_SECURE"
	)
	if endpoint, ak, sk, mAddr := os.Getenv(
		MinioEndpoint,
	), os.Getenv(
		MinioAk,
	), os.Getenv(
		MinioSk,
	), os.Getenv(
		MinioMetricsAddr,
	); endpoint != "" &&
		ak != "" &&
		sk != "" &&
		mAddr != "" {
		reconciler.Info("init minio client")
		if reconciler.ObjStorageClient, err = objectstorage.NewOSClient(
			endpoint,
			ak,
			sk,
		); err != nil {
			return fmt.Errorf("initialize object storage client: %w", err)
		}
		_, err := reconciler.ObjStorageClient.ListBuckets(ctx)
		if err != nil {
			return monitorInitializationError(ctx, "list object storage buckets", err)
		}
		if reconciler.PromURL = os.Getenv(PromURL); reconciler.PromURL == "" {
			reconciler.Info("prometheus url not found, please check env: PROM_URL")
		}
		secure := env.GetBoolWithDefault(MinioMetricsAddrSecure, false)
		reconciler.ObjStorageMetricsClient, err = objectstorage.NewMetricsClient(
			mAddr,
			ak,
			sk,
			secure,
		)
		if err != nil {
			return fmt.Errorf("initialize object storage metrics client: %w", err)
		}
		reconciler.Info(
			fmt.Sprintf(
				"init minio client with info (endpoint %s, metrics addr %s, metrics addr secure %v) success",
				endpoint,
				mAddr,
				secure,
			),
		)
	} else {
		reconciler.Info(
			"minio info not found, please check env: MINIO_ENDPOINT, MINIO_AK, MINIO_SK, MINIO_METRICS_ADDR",
		)
	}
	err = reconciler.DBClient.CreateTTLTrafficTimeSeries()
	if err != nil {
		reconciler.Error(err, "failed to create ttl traffic time series")
	}
	maintenanceCtx, cancelMaintenance := context.WithCancel(ctx)
	var maintenance sync.WaitGroup
	maintenance.Add(1)
	go func() {
		defer maintenance.Done()
		runMonitorMaintenance(maintenanceCtx, func() {
			err := reconciler.DBClient.CreateMonitorTimeSeriesIfNotExist(
				time.Now().UTC().Add(24 * time.Hour),
			)
			if err != nil {
				reconciler.Error(err, "failed to create monitor time series")
			}
			if err := reconciler.DropMonitorCollectionOlder(); err != nil {
				reconciler.Error(err, "failed to drop monitor collection")
			}
		})
	}()
	defer func() {
		cancelMaintenance()
		maintenance.Wait()
	}()
	return reconciler.StartReconciler(ctx)
}

func monitorInitializationError(ctx context.Context, stage string, err error) error {
	if ctx.Err() != nil && errors.Is(err, ctx.Err()) {
		return nil
	}
	return fmt.Errorf("%s: %w", stage, err)
}

func disconnectMonitorDatabase(db interface {
	Disconnect(ctx context.Context) error
},
) {
	// Cleanup must remain usable after the leader context has been canceled.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.Disconnect(ctx); err != nil {
		setupLog.Error(err, "failed to disconnect monitor database")
	}
}

func runMonitorMaintenance(ctx context.Context, maintain func()) {
	timer := time.NewTimer(time.Until(getNextMidnight()))
	defer timer.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
			if ctx.Err() != nil {
				return
			}
			maintain()
			timer.Reset(24 * time.Hour)
		}
	}
}

// getNextMidnight returns the next midnight time from now
func getNextMidnight() time.Time {
	now := time.Now().UTC()
	midnight := time.Date(now.Year(), now.Month(), now.Day(), 23, 0, 0, 0, time.UTC)
	return midnight
}
