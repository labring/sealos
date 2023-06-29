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

	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/go-logr/logr"
	cloudv1 "github.com/labring/sealos/controllers/cloud/api/v1"
	"github.com/labring/sealos/controllers/cloud/internal/controller/util"
	cloud "github.com/labring/sealos/controllers/cloud/internal/manager"
	"github.com/labring/sealos/controllers/pkg/crypto"
)

// LicenseReconciler reconciles a License object
type LicenseReconciler struct {
	client.Client
	Scheme       *runtime.Scheme
	logger       logr.Logger
	MonitorCache cloud.LicenseMonitorResult
	Users        cloud.UserCategory
	needMonitor  bool
}

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
	r.logger.Info("Enter LicenseReconcile", "namespace:", req.Namespace, "name", req.Name)
	var license cloudv1.License
	err := r.Client.Get(ctx, types.NamespacedName{Namespace: req.Namespace, Name: req.Name}, &license)
	if err != nil {
		r.logger.Error(err, "namespace:", req.Namespace, "name:", req.Name)
		return ctrl.Result{}, err
	}
	payload, ok := crypto.IsLicenseValid(license)
	if !ok {
		err := errors.New("error license")
		r.logger.Error(err, "namespace:", req.Namespace, "name:", req.Name)
		util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Name, req.Namespace, "your license is valid")

	}

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *LicenseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("LicenseReconcile")
	r.Users = cloud.UserCategory{}
	r.needMonitor = true

	Predicate := predicate.NewPredicateFuncs(func(object client.Object) bool {
		return object.GetName() == cloud.LicenseName &&
			object.GetLabels() != nil &&
			object.GetLabels()[cloud.IsRead] == cloud.FALSE
	})
	return ctrl.NewControllerManagedBy(mgr).
		For(&cloudv1.CloudClient{}, builder.WithPredicates(Predicate)).
		Complete(r)
}
