/*
Copyright 2022 labring.

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
	"reflect"

	"github.com/labring/sealos/controllers/pkg/crypto"

	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"sigs.k8s.io/controller-runtime/pkg/controller"

	"github.com/go-logr/logr"
	"k8s.io/apimachinery/pkg/runtime"

	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/types"
)

type ActivityReconciler struct {
	client.Client
	Scheme   *runtime.Scheme
	Logger   logr.Logger
	Activity types.Activities
}

//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Payment object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.2/pkg/reconcile
func (r *ActivityReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger = log.FromContext(ctx)

	account := &accountv1.Account{}
	if err := r.Get(ctx, req.NamespacedName, account); err != nil {
		r.Logger.Error(err, "get account failed")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	userActivities, err := types.ParseUserActivities(account.Annotations)
	if err != nil {
		r.Logger.Error(err, "parse user activities failed")
		return ctrl.Result{}, err
	}
	anno, err := r.giveAmount(userActivities, account)
	if err != nil {
		return ctrl.Result{}, err
	}
	if anno != nil {
		if err := SyncAccountStatus(context.Background(), r.Client, account); err != nil {
			r.Logger.Error(err, "update account status failed: %+v", "account", *account)
			return ctrl.Result{}, err
		}
		account.Annotations = anno
		if err := r.Update(ctx, account); err != nil {
			r.Logger.Error(err, "update account failed: %v", "account", *account)
			return ctrl.Result{}, err
		}
		r.Logger.Info("update account success", "account", account.Name, "anno", account.Status.Balance)
	}
	return ctrl.Result{}, nil
}

func (r *ActivityReconciler) giveAmount(userActivities types.UserActivities, account *accountv1.Account) (annotations map[string]string, err error) {
	for activityType, userActivity := range userActivities {
		activity, exist := r.Activity[activityType]
		if !exist {
			r.Logger.Error(nil, "activity not exist", "activity", activity)
			continue
		}
		userPhase, exist := userActivity.Phases[userActivity.CurrentPhase]
		if !exist {
			r.Logger.Error(nil, "userPhase not exist", "activity", activityType, "phase", userActivity.CurrentPhase)
			continue
		}
		if userPhase.EndTime.IsZero() {
			continue
		}
		giveAmount := activity.Phases[userActivity.CurrentPhase].GiveAmount
		if giveAmount != 0 && userPhase.GiveAmount == 0 {
			err := crypto.RechargeBalance(account.Status.EncryptBalance, giveAmount)
			if err != nil {
				return nil, fmt.Errorf("give account %s amount failed: %w", account.Name, err)
			}
			account.Status.Balance += giveAmount
			account.Status.ActivityBonus += giveAmount
			return types.SetUserPhaseGiveAmount(account.Annotations, activityType, userActivity.CurrentPhase, giveAmount), nil
		}
	}
	return nil, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ActivityReconciler) SetupWithManager(mgr ctrl.Manager, rateOpts controller.Options) error {
	const controllerName = "activity_controller"
	r.Logger = ctrl.Log.WithName(controllerName)
	return ctrl.NewControllerManagedBy(mgr).
		For(&accountv1.Account{}).
		WithEventFilter(predicate.Funcs{
			CreateFunc: func(e event.CreateEvent) bool {
				return len(e.Object.GetAnnotations()) > 1
			},
			UpdateFunc: func(e event.UpdateEvent) bool {
				accountOld := e.ObjectOld.(*accountv1.Account)
				accountNew := e.ObjectNew.(*accountv1.Account)
				if len(accountNew.Annotations) == 0 {
					return false
				}
				return !reflect.DeepEqual(accountOld.Annotations, accountNew.Annotations)
			},
			DeleteFunc: func(e event.DeleteEvent) bool {
				return false
			},
		}).WithOptions(rateOpts).Complete(r)
}
