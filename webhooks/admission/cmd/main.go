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
	"strings"

	v1 "github.com/labring/sealos/webhook/admission/api/v1"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	_ "k8s.io/client-go/plugin/pkg/client/auth"
	ctrl "sigs.k8s.io/controller-runtime"

	"sigs.k8s.io/controller-runtime/pkg/builder"
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

	//utilruntime.Must(netv1.AddToScheme(scheme))
	//+kubebuilder:scaffold:scheme
}

func main() {
	var metricsAddr string
	var enableLeaderElection bool
	var probeAddr string
	var ingressAnnotationString string
	var domains v1.DomainList
	flag.StringVar(&metricsAddr, "metrics-bind-address", ":8080", "The address the metric endpoint binds to.")
	flag.StringVar(&probeAddr, "health-probe-bind-address", ":8081", "The address the probe endpoint binds to.")
	flag.BoolVar(&enableLeaderElection, "leader-elect", false,
		"Enable leader election for controller manager. "+
			"Enabling this will ensure there is only one active controller manager.")
	flag.StringVar(&ingressAnnotationString, "ingress-mutating-annotations", "", "Ingress annotations: 'key1=value1,key2=value2'")
	flag.Var(&domains, "domains", "Domains to be used for check ingress cname")
	opts := zap.Options{
		Development: true,
	}
	opts.BindFlags(flag.CommandLine)
	flag.Parse()

	ctrl.SetLogger(zap.New(zap.UseFlagOptions(&opts)))

	if len(domains) == 0 {
		setupLog.Error(nil, "domains is empty")
		os.Exit(1)
	}

	setupLog.Info("domains:", "domains", strings.Join(domains, ","))
	setupLog.Info("ingress annotations:", "annotation", ingressAnnotationString)
	ingressAnnotations := make(map[string]string)
	if ingressAnnotationString != "" {
		kvs := strings.Split(ingressAnnotationString, ",")
		for _, kv := range kvs {
			parts := strings.Split(kv, "=")
			if len(parts) == 2 {
				key := parts[0]
				value := parts[1]
				ingressAnnotations[key] = value
			} else {
				setupLog.Error(nil, "ingress annotation format error", "annotation", kv)
				os.Exit(1)
			}
		}
	}

	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
		Scheme:                 scheme,
		MetricsBindAddress:     metricsAddr,
		Port:                   9443,
		HealthProbeBindAddress: probeAddr,
		LeaderElection:         enableLeaderElection,
		LeaderElectionID:       "849b6b0b.sealos.io",
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

	if (&v1.IngressValidator{
		Domains: domains,
	}).SetupWithManager(mgr) != nil {
		setupLog.Error(err, "unable to create ingress validator webhook")
		os.Exit(1)
	}

	if (&v1.IngressMutator{
		IngressAnnotations: ingressAnnotations,
		Domains:            domains,
	}).SetupWithManager(mgr) != nil {
		setupLog.Error(err, "unable to create ingress mutator webhook")
		os.Exit(1)
	}

	err = builder.WebhookManagedBy(mgr).
		For(&corev1.Namespace{}).
		WithValidator(&v1.NamespaceValidator{Client: mgr.GetClient()}).
		WithDefaulter(&v1.NamespaceMutator{Client: mgr.GetClient()}).
		Complete()
	if err != nil {
		setupLog.Error(err, "unable to create namespace webhook")
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
