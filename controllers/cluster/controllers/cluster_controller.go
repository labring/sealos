/*
Copyright 2022.

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

package controllers

import (
	"context"
	"fmt"

	"github.com/labring/sealos/controllers/cluster/applier"

	infrav1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/drivers"
	"github.com/labring/sealos/pkg/utils/logger"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	v1 "github.com/labring/sealos/controllers/cluster/api/v1"
)

// ClusterReconciler reconciles a Cluster object
type ClusterReconciler struct {
	client.Client
	driver  drivers.Driver
	applier applier.Reconcile
	Scheme  *runtime.Scheme
}

//+kubebuilder:rbac:groups=cluster.sealos.io,resources=clusters,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cluster.sealos.io,resources=clusters/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cluster.sealos.io,resources=clusters/finalizers,verbs=update
//+kubebuilder:rbac:groups=infra.sealos.io,resources=infras,verbs=get;list;watch;create;update;patch;delete

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Cluster object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.2/pkg/reconcile
func (r *ClusterReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	_ = log.FromContext(ctx)
	cluster := &v1.Cluster{}

	if err := r.Get(ctx, req.NamespacedName, cluster); err != nil {
		logger.Debug("ignore not found cluster error: %v", err)
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	infra := &infrav1.Infra{}
	infra.Name = cluster.Spec.Infra
	infra.Namespace = cluster.Namespace

	key := client.ObjectKey{Namespace: infra.Namespace, Name: infra.Name}
	if err := r.Get(ctx, key, infra); err != nil {
		logger.Debug("ignore not found cluster error: %v", err)
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	hosts, err := r.driver.GetInstances(infra)

	if err != nil {
		logger.Error("get instances error: %v", err)
		return ctrl.Result{}, err
	}

	if cluster.Spec.SSH.PkData == "" {
		cluster.Spec.SSH.PkData = infra.Spec.SSH.PkData
	}

	err = r.applier.ReconcileCluster(infra, hosts, cluster)
	if err != nil {
		logger.Error("reconcile cluster error: %v", err)
		return ctrl.Result{}, err
	}

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ClusterReconciler) SetupWithManager(mgr ctrl.Manager) error {
	var err error
	r.driver, err = drivers.NewDriver()
	if err != nil {
		return fmt.Errorf("cluster controller new driver failed: %v", err)
	}
	r.applier = applier.NewApplier()

	return ctrl.NewControllerManagedBy(mgr).
		For(&v1.Cluster{}).
		Complete(r)
}
