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
	"time"

	_ "github.com/golang-jwt/jwt"
	v1 "github.com/labring/sealos/controllers/cloud/api/v1"
	cloud "github.com/labring/sealos/controllers/cloud/internal/cloudtool"
	"github.com/labring/sealos/pkg/utils/logger"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// LicenseReconciler reconciles a License object
type LicenseReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	ExpOps v1.WebhookMgr
	Cloud  cloud.LicenseManager
}

//+kubebuilder:rbac:groups="",resources=namespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=configmaps,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=licenses,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=licenses/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=licenses/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the License object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.14.4/pkg/reconcile
func (r *LicenseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger.Info("enter LicenseReconcile ", "namespace: ", req.Namespace, "name: ", req.Name)
	time.Sleep(time.Second * 3)
	var license v1.License
	if ok := cloud.GetImportantResource(r.Client, &license, ctx, cloud.Namespace, cloud.LicenseName); !ok {
		logger.Error("GetImportantResource: license error", "cluster has been locked")
		return ctrl.Result{RequeueAfter: time.Second * 300}, nil
	}
	license.Labels["isRead"] = "true"
	if err := r.Client.Update(ctx, &license); err != nil {
		logger.Error("failed to update license")
		return ctrl.Result{RequeueAfter: time.Second * 5}, err
	}
	logger.Info("Checking the validity of the license")
	var ok bool
	var remainTime int64
	if remainTime, ok = r.Cloud.IsLicenseValid(&license); !ok {
		r.ExpOps.IsExp = true
		logger.Error("license expired")
		return ctrl.Result{}, nil
	}
	r.ExpOps.IsExp = false
	logger.Info("The certificate will expire in ...", time.Second*time.Duration(remainTime))
	// TODO(user): your logic here
	if remainTime > 5 {
		return ctrl.Result{RequeueAfter: time.Duration(remainTime) / 2 * time.Second}, nil
	}
	return ctrl.Result{RequeueAfter: time.Second * 5}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *LicenseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	nameFilter := cloud.LicenseName
	namespaceFilter := cloud.Namespace
	r.ExpOps = v1.WH
	Predicates := predicate.NewPredicateFuncs(func(obj client.Object) bool {
		return obj.GetName() == nameFilter &&
			obj.GetNamespace() == namespaceFilter &&
			obj.GetLabels()["isRead"] == "false"
	})
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1.License{}, builder.WithPredicates(Predicates)).
		Complete(r)
}
