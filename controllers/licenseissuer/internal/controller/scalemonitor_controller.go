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
	"fmt"
	"time"

	"github.com/go-logr/logr"
	v1 "github.com/labring/sealos/controllers/common/notification/api/v1"
	cloud "github.com/labring/sealos/controllers/licenseissuer/internal/manager"
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
		WithTag(req.NamespacedName).
		WithCallback(func() error {
			clusterExpectScaleInfo.Data = make(map[string][]byte)
			clusterExpectScaleInfo.SetName(req.Name)
			clusterExpectScaleInfo.SetNamespace(req.Namespace)
			return r.Client.Create(ctx, &clusterExpectScaleInfo)
		}).
		AddToList(&readEventOperations)

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

	// if the read ops failed, limit the cluster scale to zero
	if err != nil {
		r.logger.Error(err, "failed to get execute event")
		expectString, _ := json.Marshal(cloud.ClusterScale{})
		if currentClusterScale.Data == nil {
			currentClusterScale.Data = make(map[string][]byte)
		}
		currentClusterScale.Data[string(cloud.ExpectScaleSecretKey)] = expectString
		return ctrl.Result{}, r.Update(ctx, &currentClusterScale)
	}

	res, isSanitized := cloud.TidyAvailableScaleData(clusterExpectScaleInfo.Data)

	isDeleted := cloud.DeleteExpireScales(res)

	if isDeleted || isSanitized {
		newMap := make(map[string][]byte)
		for k, v := range res {
			bytes, err := json.Marshal(v)
			if err != nil {
				fmt.Println("error:", err)
			}
			newMap[k] = bytes
		}
		clusterExpectScaleInfo.Data = newMap
		(&cloud.WriteEventBuilder{}).WithCallback(func() error {
			return r.Update(ctx, &clusterExpectScaleInfo)
		})
	}

	expectScale := cloud.GetCurrentScale(res, cloud.GetScaleOfMaxCPU, cloud.GetScaleOfMaxNodes)
	dateString := time.Unix(expectScale.Expire, 0).Format("2006-01-02")

	message := fmt.Sprintf("Current Maximum Cluster Scale Information: \nNode Count: %d\nCPU Count: %d\nMaximum Sustainable Duration at Current Scale: %s",
		int(expectScale.NodeLimit),
		int(expectScale.CPULimit),
		dateString)
	pack := cloud.NewNotificationPackageWithLevel(cloud.NoticeClusterScaleTitle, cloud.SEALOS, cloud.Message(message), v1.Medium)
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

	err = writeEventOperations.Execute()
	if err != nil {
		r.logger.Error(err, "failed to execute write event")
		return ctrl.Result{}, err
	}
	users := cloud.UserCategory{}
	if err = users.GetNameSpace(ctx, r.Client); err == nil {
		cloud.SubmitNotificationWithUserCategory(ctx, r.Client, r.logger, users, cloud.UserPrefix, pack)
	}
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
