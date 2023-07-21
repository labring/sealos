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
	"fmt"
	"time"

	"github.com/go-logr/logr"
	v1 "github.com/labring/sealos/controllers/common/notification/api/v1"
	issuer "github.com/labring/sealos/controllers/licenseissuer/internal/manager"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
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

// Reconcile is a method of ScaleMonitorReconciler that manages the state of a scale monitor. It creates or updates a secret representing
// the scale capacity of the cluster, calculates the maximum node and CPU count, and sends a notification to users in the namespace with
// the calculated scale data. If any operation fails, it logs the error and returns with an error status.

func (r *ScaleMonitorReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.logger.Info("Enter ScaleMonitorReconcile", "namespace:", req.Namespace, "name", req.Name)

	availableScaleSecret := corev1.Secret{}
	readEventOperations := issuer.ReadOperationList{}

	(&issuer.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).WithObject(&availableScaleSecret).
		WithTag(req.NamespacedName).
		WithCallback(func() error {
			availableScaleSecret.Data = make(map[string][]byte)
			availableScaleSecret.SetName(req.Name)
			availableScaleSecret.SetNamespace(req.Namespace)
			return r.Client.Create(ctx, &availableScaleSecret)
		}).
		AddToList(&readEventOperations)

	err := readEventOperations.Execute()
	if err != nil {
		return ctrl.Result{}, err
	}

	manager := issuer.CSMCreator(availableScaleSecret)

	nodeCount := issuer.MaxWithInt64(manager.ExpectScaleData.NodeLimit, issuer.CommunityEditionMaxNode)
	cpuCount := issuer.MaxWithInt64(manager.ExpectScaleData.CPULimit, issuer.CommunityEditionMaxCPU)

	var dateString string

	if nodeCount == 4 && cpuCount == 64 {
		dateString = "Indefinitely"
	} else {
		dateString = time.Unix(manager.ExpectScaleData.Expire, 0).Format("2006-01-02")
	}

	message := fmt.Sprintf("Current Maximum Cluster Capacity Information: \nNode Count: %d\nCPU Count: %d\nMaximum Sustainable Duration at Current Scale: %s",
		nodeCount,
		cpuCount,
		dateString)

	pack := issuer.NewNotificationPackageWithLevel(issuer.ClusterCapacityNoticeTitle, issuer.SEALOS, issuer.Message(message), v1.Medium)
	issuer.ExpectScale = manager.ExpectScaleData
	r.logger.Info(message)

	users := issuer.UserCategory{}
	if err = users.GetNameSpace(ctx, r.Client); err == nil {
		issuer.SubmitNotificationWithUserCategory(ctx, r.Client, users, issuer.UserPrefix, pack)
	}
	data, err := manager.SerializeToSecretData()
	if err != nil {
		return ctrl.Result{}, err
	}
	availableScaleSecret.Data = data
	if err = r.Client.Update(ctx, &availableScaleSecret); err != nil {
		r.logger.Error(err, "failed to update available scale secret")
		return ctrl.Result{}, err
	}
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ScaleMonitorReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("ScaleMonitorReconcile")
	Predicate := predicate.NewPredicateFuncs(func(object client.Object) bool {
		return object.GetName() == string(issuer.AvailableScaleSecretName) &&
			object.GetNamespace() == string(issuer.Namespace)
	})
	return ctrl.NewControllerManagedBy(mgr).
		// Uncomment the following line adding a pointer to an instance of the controlled resource as an argument
		For(&corev1.Secret{}, builder.WithPredicates(Predicate)).
		Complete(r)
}
