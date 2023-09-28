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

	"github.com/go-logr/logr"
	issuerv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"github.com/labring/sealos/controllers/licenseissuer/internal/controller/util"
	"github.com/labring/sealos/controllers/pkg/crypto"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// ClusterScaleBillingReconciler reconciles a ClusterScaleBilling object
type ClusterScaleBillingReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	csb    *issuerv1.ClusterScaleBilling
	logger logr.Logger
}

//+kubebuilder:rbac:groups=infostream.sealos.io,resources=clusterscalebillings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=infostream.sealos.io,resources=clusterscalebillings/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=infostream.sealos.io,resources=clusterscalebillings/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the ClusterScaleBilling object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.15.0/pkg/reconcile

func (r *ClusterScaleBillingReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	err := r.Get(ctx, req.NamespacedName, r.csb)
	if err != nil && !apierrors.IsNotFound(err) {
		r.logger.Info("get cluster scale billing error", "error", err)
		return ctrl.Result{}, err
	}
	if apierrors.IsNotFound(err) {
		newCsb := &issuerv1.ClusterScaleBilling{}
		newCsb.Name = req.Name
		newCsb.Namespace = req.Namespace
		return ctrl.Result{}, r.Create(ctx, newCsb)
	}
	// if the cluster scale billing is not initialized, init it
	if r.csb.Status.EncryptQuota == "" {
		r.InitClusterScaleBilling()
	} else {
		// if the cluster scale billing is error, init it
		value, err := crypto.DecryptInt64WithKey(r.csb.Status.EncryptQuota, []byte(util.CryptoKey))
		if err != nil || value != r.csb.Status.Quota {
			r.logger.Info("decrypt quota error", "error", err)
			r.InitClusterScaleBilling()
		}
	}

	return ctrl.Result{}, r.Client.Status().Update(ctx, r.csb)
}

// SetupWithManager sets up the controller with the Manager.
func (r *ClusterScaleBillingReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("ClusterScaleBilling")
	r.csb = &issuerv1.ClusterScaleBilling{}

	return ctrl.NewControllerManagedBy(mgr).
		// Uncomment the following line adding a pointer to an instance of the controlled resource as an argument
		For(&issuerv1.ClusterScaleBilling{}).
		Complete(r)
}

func (r *ClusterScaleBillingReconciler) InitClusterScaleBilling() {
	eq, _ := crypto.EncryptInt64WithKey(0, []byte(util.CryptoKey))
	r.csb.Status = issuerv1.ClusterScaleBillingStatus{
		Quota:        0,
		Used:         0,
		EncryptQuota: *eq,
		EncryptUsed:  *eq,
	}
}
