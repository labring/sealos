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
	"encoding/json"

	"github.com/go-logr/logr"
	cloud "github.com/labring/sealos/controllers/monitor/internal/manager"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// ScaleMonitorReconciler reconciles a ScaleMonitor object
type ScaleMonitorReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	logger logr.Logger
}

//+kubebuilder:rbac:groups=cloud.sealos.io,resources=scalemonitors,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=scalemonitors/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=scalemonitors/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the ScaleMonitor object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.15.0/pkg/reconcile
func (r *ScaleMonitorReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.logger.Info("Enter ScaleMonitorReconcile", "namespace:", req.Namespace, "name", req.Name)

	clusterExpectScaleInfo := corev1.Secret{}
	currentClusterScale := corev1.Secret{}
	readEventOperations := cloud.ReadOperationList{}
	writeEventOperations := cloud.WriteOperationList{}

	(&cloud.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).WithObject(&clusterExpectScaleInfo).
		WithTag(req.NamespacedName).AddToList(&readEventOperations)

	(&cloud.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).WithObject(&currentClusterScale).WithTag(
		types.NamespacedName{
			Namespace: string(cloud.Namespace),
			Name:      string(cloud.ExpectScaleSecretName),
		}).
		WithCallback(func() error {
			currentClusterScale.SetName(string(cloud.ExpectScaleSecretName))
			currentClusterScale.SetNamespace(string(cloud.Namespace))
			return r.Client.Create(ctx, &currentClusterScale)
		}).AddToList(&readEventOperations)

	err := readEventOperations.Execute()
	if err != nil {
		r.logger.Error(err, "failed to get execute event")
		return ctrl.Result{}, err
	}

	res, err := cloud.ParseScaleData(clusterExpectScaleInfo.Data)
	if err != nil {
		r.logger.Error(err, "failed to parse scale data")
	}
	cloud.DeleteExpireScales(res)
	expectScale := cloud.GetCurrentScale(res, cloud.GetScaleOfMaxCpu, cloud.GetScaleOfMaxNodes)

	expectString, err := json.Marshal(expectScale)
	if err != nil {
		r.logger.Error(err, "failed to parse expect string")
		return ctrl.Result{}, err
	}

	(&cloud.WriteEventBuilder{}).WithCallback(func() error {
		if currentClusterScale.Data == nil {
			currentClusterScale.Data = make(map[string][]byte)
		}
		currentClusterScale.Data[string(cloud.ExpectScaleSecretKey)] = expectString
		return r.Client.Update(ctx, &currentClusterScale)
	}).AddToList(&writeEventOperations)

	_ = writeEventOperations.Execute()
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ScaleMonitorReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("ScaleMonitorReconcile")
	Predicate := predicate.NewPredicateFuncs(func(object client.Object) bool {
		return object.GetName() == string(cloud.ClusterScaleSecretName) &&
			object.GetNamespace() == string(cloud.Namespace)
	})
	return ctrl.NewControllerManagedBy(mgr).
		// Uncomment the following line adding a pointer to an instance of the controlled resource as an argument
		For(&corev1.Secret{}, builder.WithPredicates(Predicate)).
		Complete(r)
}
