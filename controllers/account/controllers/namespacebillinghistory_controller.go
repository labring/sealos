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

package controllers

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/labring/sealos/controllers/pkg/database/mongo"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"

	"github.com/go-logr/logr"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/labring/sealos/controllers/pkg/database"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
)

// NamespaceBillingHistoryReconciler reconciles a NamespaceBillingHistory object
type NamespaceBillingHistoryReconciler struct {
	client.Client
	Scheme     *runtime.Scheme
	Logger     logr.Logger
	MongoDBURI string
}

//+kubebuilder:rbac:groups=account.sealos.io,resources=namespacebillinghistories,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=namespacebillinghistories/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=account.sealos.io,resources=namespacebillinghistories/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the NamespaceBillingHistory object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.11.2/pkg/reconcile
func (r *NamespaceBillingHistoryReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	dbCtx := context.Background()
	dbClient, err := mongo.NewMongoInterface(dbCtx, r.MongoDBURI)
	if err != nil {
		r.Logger.Error(err, "connect mongo client failed")
		return ctrl.Result{Requeue: true}, err
	}
	defer func() {
		err := dbClient.Disconnect(ctx)
		if err != nil {
			r.Logger.V(5).Info("disconnect mongo client failed", "err", err)
		}
	}()

	nsHistory := &accountv1.NamespaceBillingHistory{}
	err = r.Get(ctx, req.NamespacedName, nsHistory)
	if err == nil {
		// delete after 3 minutes
		if time.Since(nsHistory.CreationTimestamp.Time) > 3*time.Minute {
			return ctrl.Result{}, r.Delete(ctx, nsHistory)
		}
		if err = r.reconcile(ctx, req, dbClient, nsHistory); err != nil {
			r.Logger.Error(err, "reconcile failed")
			nsHistory.Status.Status = accountv1.Failed
		}
		if err = r.Status().Update(ctx, nsHistory); err == nil {
			// return after 4 minutes
			return ctrl.Result{RequeueAfter: 4 * time.Minute}, nil
		}
	}

	return ctrl.Result{}, client.IgnoreNotFound(err)
}

func (r *NamespaceBillingHistoryReconciler) reconcile(ctx context.Context, req ctrl.Request, dbClient database.Account, nsHistory *accountv1.NamespaceBillingHistory) error {
	user := &userv1.User{}
	if err := r.Get(ctx, client.ObjectKey{Namespace: req.Namespace, Name: getUsername(req.Namespace)}, user); err != nil {
		return fmt.Errorf("get user failed: %w", err)
	}
	owner, ok := user.GetAnnotations()[userv1.UserAnnotationOwnerKey]
	if !ok {
		return fmt.Errorf("user %s has no annotations %s", user.Name, userv1.UserLabelOwnerKey)
	}
	nsList, err := dbClient.GetBillingHistoryNamespaceList(&nsHistory.Spec, owner)
	if err != nil {
		return fmt.Errorf("get billing history namespace list failed: %w", err)
	}
	nsHistory.Status.NamespaceList = nsList
	nsHistory.Status.Status = accountv1.Completed
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *NamespaceBillingHistoryReconciler) SetupWithManager(mgr ctrl.Manager) error {
	if r.MongoDBURI = os.Getenv(database.MongoURI); r.MongoDBURI == "" {
		return fmt.Errorf("env %s is empty", database.MongoURI)
	}
	r.Logger = log.Log.WithName("namespacebillinghistories-controller")
	return ctrl.NewControllerManagedBy(mgr).
		For(&accountv1.NamespaceBillingHistory{}).
		Complete(r)
}
