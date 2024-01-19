/*
Copyright 2023 sealos.

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
	"strings"
	"time"

	"github.com/labring/sealos/controllers/pkg/types"

	v12 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/resources"

	"sigs.k8s.io/controller-runtime/pkg/controller"

	"github.com/go-logr/logr"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/labring/sealos/controllers/pkg/database"
	v1 "github.com/labring/sealos/controllers/user/api/v1"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	UserNamespacePrefix = "ns-"
	ResourceQuotaPrefix = "quota-"
)

const BillingAnnotationLastUpdateTime = "account.sealos.io/last-update-time"

// BillingReconciler reconciles a Billing object
type BillingReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	logr.Logger
	DBClient   database.Account
	AccountV2  database.AccountV2
	Properties *resources.PropertyTypeLS
}

//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=resourcequotas,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=rolebindings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=roles,verbs=get;list;watch;create;update;patch;delete

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Billing object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.11.2/pkg/reconcile
func (r *BillingReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(1).Info("Reconcile Billing: ", "req.NamespacedName", req.NamespacedName)
	ns := &corev1.Namespace{}
	if err := r.Get(ctx, req.NamespacedName, ns); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if ns.DeletionTimestamp != nil {
		r.Logger.V(1).Info("namespace is deleting", "namespace", ns)
		return ctrl.Result{}, nil
	}

	owner := ns.Labels[v1.UserLabelOwnerKey]
	nsList, err := getOwnNsList(r.Client, owner)
	if err != nil {
		r.Logger.Error(err, "get own namespace list failed")
		return ctrl.Result{Requeue: true}, err
	}
	r.Logger.V(1).Info("own namespace list", "own", owner, "nsList", nsList)
	now := time.Now()
	currentHourTime := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, time.Local).UTC()
	queryTime := currentHourTime.Add(-1 * time.Hour)

	// TODO r.处理Unsettle状态的账单

	if exist, lastUpdateTime, _ := r.DBClient.GetBillingLastUpdateTime(owner, v12.Consumption); exist {
		if lastUpdateTime.Equal(currentHourTime) || lastUpdateTime.After(currentHourTime) {
			return ctrl.Result{Requeue: true, RequeueAfter: time.Until(currentHourTime.Add(1*time.Hour + 10*time.Minute))}, nil
		}
		// 24小时内的数据，从上次更新时间开始计算，否则从当前时间起算
		if lastUpdateTime.After(currentHourTime.Add(-24 * time.Hour)) {
			queryTime = lastUpdateTime
		}
	}

	orderList := []string{}
	consumAmount := int64(0)
	// 计算上次billing到当前的时间之间的整点，左开右闭
	for t := queryTime.Truncate(time.Hour).Add(time.Hour); t.Before(currentHourTime) || t.Equal(currentHourTime); t = t.Add(time.Hour) {
		ids, amount, err := r.DBClient.GenerateBillingData(t.Add(-1*time.Hour), t, r.Properties, nsList, getUsername(owner))
		if err != nil {
			return ctrl.Result{}, fmt.Errorf("generate billing data failed: %w", err)
		}
		orderList = append(orderList, ids...)
		consumAmount += amount
	}
	if consumAmount > 0 {
		if err := r.rechargeBalance(owner, consumAmount); err != nil {
			for i := range orderList {
				if err := r.DBClient.UpdateBillingStatus(orderList[i], resources.Unsettled); err != nil {
					r.Logger.Error(err, "update billing status failed", "id", orderList[i])
				}
			}
			return ctrl.Result{}, fmt.Errorf("recharge balance failed: %w", err)
		}
		r.Logger.V(1).Info("success recharge balance", "owner", owner, "amount", consumAmount)
	}
	return ctrl.Result{Requeue: true, RequeueAfter: time.Until(currentHourTime.Add(1*time.Hour + 10*time.Minute))}, nil
}

func (r *BillingReconciler) rechargeBalance(owner string, amount int64) (err error) {
	if amount == 0 {
		return nil
	}
	if err := r.AccountV2.AddDeductionBalance(&types.UserQueryOpts{Owner: owner}, amount); err != nil {
		return fmt.Errorf("add balance failed: %w", err)
	}
	return nil
}

func getOwnNsList(clt client.Client, user string) ([]string, error) {
	nsList := &corev1.NamespaceList{}
	if err := clt.List(context.Background(), nsList, client.MatchingLabels{v1.UserLabelOwnerKey: user}); err != nil {
		return nil, fmt.Errorf("list namespace failed: %w", err)
	}
	nsListStr := make([]string, len(nsList.Items))
	for i := range nsList.Items {
		nsListStr[i] = nsList.Items[i].Name
	}
	return nsListStr, nil
}

func (r *BillingReconciler) initDB() error {
	return r.DBClient.CreateBillingIfNotExist()
}

// SetupWithManager sets up the controller with the Manager.
func (r *BillingReconciler) SetupWithManager(mgr ctrl.Manager, rateOpts controller.Options) error {
	r.Logger = ctrl.Log.WithName("controller").WithName("Billing")
	if err := r.initDB(); err != nil {
		r.Logger.Error(err, "init db failed")
	}
	return ctrl.NewControllerManagedBy(mgr).
		For(&corev1.Namespace{}, builder.WithPredicates(predicate.Funcs{
			CreateFunc: func(createEvent event.CreateEvent) bool {
				own, ok := createEvent.Object.GetLabels()[v1.UserLabelOwnerKey]
				return ok && getUsername(createEvent.Object.GetName()) == own
			},
			UpdateFunc: func(updateEvent event.UpdateEvent) bool {
				return false
			},
			DeleteFunc: func(deleteEvent event.DeleteEvent) bool {
				return false
			},
			GenericFunc: func(genericEvent event.GenericEvent) bool {
				return false
			},
		})).
		WithOptions(rateOpts).
		Complete(r)
}

func getUsername(namespace string) string {
	return strings.TrimPrefix(namespace, UserNamespacePrefix)
}
