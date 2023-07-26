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

package controller

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/go-logr/logr"
	cloudv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"github.com/labring/sealos/controllers/licenseissuer/internal/controller/util"
	issuer "github.com/labring/sealos/controllers/licenseissuer/internal/manager"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// CollectorReconciler reconciles a Collector object
type CollectorReconciler struct {
	client.Client
	Scheme            *runtime.Scheme
	logger            logr.Logger
	lastCollectedTime int64
}

//+kubebuilder:rbac:groups=infostream.sealos.io,resources=collectors,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=infostream.sealos.io,resources=collectors/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=infostream.sealos.io,resources=collectors/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Collector object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.14.4/pkg/reconcile
func (r *CollectorReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.logger.Info("Enter CollectorReconcile", "namespace:", req.Namespace, "name", req.Name)

	var (
		info      corev1.Secret
		configMap corev1.ConfigMap
		launcher  cloudv1.Launcher
	)

	var (
		readOperations  issuer.ReadOperationList
		writeOperations issuer.WriteOperationList
	)

	// read and write operations
	(&issuer.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).WithObject(&launcher).
		WithTag(types.NamespacedName{Namespace: string(issuer.Namespace), Name: string(issuer.ClientStartName)}).
		AddToList(&readOperations)
	(&issuer.WriteEventBuilder{}).WithCallback(func() error {
		if launcher.Labels[string(issuer.CollectorLable)] == issuer.TRUE {
			return nil
		}
		launcher.Labels[string(issuer.CollectorLable)] = issuer.TRUE
		return r.Client.Update(ctx, &launcher)
	}).AddToList(&writeOperations)

	(&issuer.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).WithObject(&info).
		WithTag(types.NamespacedName{Namespace: string(issuer.Namespace), Name: string(issuer.ClusterInfoSecretName)}).
		AddToList(&readOperations)
	(&issuer.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).WithObject(&configMap).
		WithTag(types.NamespacedName{Namespace: string(issuer.Namespace), Name: string(issuer.URLConfigName)}).
		AddToList(&readOperations)

	if err := readOperations.Execute(); err != nil {
		r.logger.Error(err, "failed to read resources...")
		return ctrl.Result{}, err
	}
	if err := writeOperations.Execute(); err != nil {
		r.logger.Error(err, "failed to write resources...")
		return ctrl.Result{}, err
	}

	// collect the resource info of the cluster
	config, err := util.ReadConfigFromConfigMap(string(issuer.URLConfigName), &configMap)
	if err != nil {
		r.logger.Error(err, "failed to read config")
		return ctrl.Result{}, err
	}

	r.logger.Info("Start to get the node info of the cluster")
	clusterResource := issuer.NewClusterResource()
	totalNodesResource := issuer.NewTotalNodesResource(`\w+\.com/gpu`)

	nodeList := &corev1.NodeList{}
	err = r.Client.List(ctx, nodeList)
	if err != nil {
		r.logger.Error(err, "failed to get node info of the cluster")
		return ctrl.Result{}, err
	}
	pvList := &corev1.PersistentVolumeList{}
	err = r.Client.List(ctx, pvList)
	if err != nil {
		r.logger.Error(err, "failed to get PV info of the cluster")
		return ctrl.Result{}, err
	}

	clusterResource.Nodes = strconv.Itoa(len(nodeList.Items))
	r.logger.Info("Start get the cpu&gpu&memory info of the cluster")
	var wg sync.WaitGroup
	for _, node := range nodeList.Items {
		wg.Add(1)
		go totalNodesResource.GetGPUCPUMemoryResource(&node, &wg)
	}
	wg.Wait()
	for _, pv := range pvList.Items {
		storage := pv.Spec.Capacity[corev1.ResourceStorage]
		totalNodesResource.TotalPVCapacity.Add(storage)
	}
	clusterResource.CPU = totalNodesResource.TotalCPU.String()
	clusterResource.GPU = totalNodesResource.TotalGPU.String()
	clusterResource.Memory = totalNodesResource.TotalMemory.String()
	clusterResource.Disk = totalNodesResource.TotalPVCapacity.String()

	collector := issuer.CollectorInfo{
		UID:             string(info.Data["uid"]),
		InfoType:        issuer.ResourceOnCluster,
		ClusterResource: clusterResource,
	}
	r.logger.Info("Start to collector the node info of the cluster")
	httpBody, err := issuer.CommunicateWithCloud("POST", config.CollectorURL, collector)
	if err != nil {
		r.logger.Error(err, "failed to communicate with cloud")
		return ctrl.Result{}, err
	}
	if !issuer.IsSuccessfulStatusCode(httpBody.StatusCode) {
		err := errors.New(http.StatusText(httpBody.StatusCode))
		r.logger.Error(err, err.Error())
		return ctrl.Result{}, err
	}

	return ctrl.Result{RequeueAfter: time.Minute * 60}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *CollectorReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("CollectorReconcile")
	r.lastCollectedTime = time.Now().Add(time.Hour * 100).Unix()
	Predicate := predicate.NewPredicateFuncs(func(object client.Object) bool {
		return object.GetName() == string(issuer.ClientStartName) &&
			object.GetNamespace() == string(issuer.Namespace) &&
			object.GetLabels() != nil &&
			object.GetLabels()[string(issuer.CollectorLable)] == string(issuer.FALSE)
	})
	return ctrl.NewControllerManagedBy(mgr).
		For(&cloudv1.Launcher{}, builder.WithPredicates(Predicate)).
		Complete(r)
}
