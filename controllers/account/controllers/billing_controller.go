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
	"os"
	"strings"
	"time"

	"sigs.k8s.io/controller-runtime/pkg/controller"

	"github.com/go-logr/logr"
	v12 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/database"
	v1 "github.com/labring/sealos/controllers/user/api/v1"
	gonanoid "github.com/matoous/go-nanoid/v2"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

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
	Scheme   *runtime.Scheme
	mongoURI string
	logr.Logger
	AccountSystemNamespace string
}

//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=resourcequotas,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=rolebindings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=roles,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=accountbalances,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=accountbalances/status,verbs=get;list;watch;create;update;patch;delete

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
	dbCtx := context.Background()
	dbClient, err := database.NewMongoDB(dbCtx, r.mongoURI)
	if err != nil {
		r.Logger.Error(err, "connect mongo client failed")
		return ctrl.Result{Requeue: true}, err
	}
	defer func() {
		err := dbClient.Disconnect(dbCtx)
		if err != nil {
			r.Logger.V(5).Info("disconnect mongo client failed", "err", err)
		}
	}()
	ns := &corev1.Namespace{}
	if err := r.Get(ctx, req.NamespacedName, ns); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if ns.DeletionTimestamp != nil {
		r.Logger.V(1).Info("namespace is deleting", "namespace", ns)
		return ctrl.Result{}, nil
	}

	own := ns.Labels[v1.UserLabelOwnerKey]
	nsList, err := getOwnNsList(r.Client, own)
	if err != nil {
		r.Logger.Error(err, "get own namespace list failed")
		return ctrl.Result{Requeue: true}, err
	}
	r.Logger.V(1).Info("own namespace list", "own", own, "nsList", nsList)
	now := time.Now()
	currentHourTime := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, time.Local).UTC()
	queryTime := currentHourTime.Add(-1 * time.Hour)
	if exist, lastUpdateTime, _ := dbClient.GetBillingLastUpdateTime(own, v12.Consumption); exist {
		if lastUpdateTime.Equal(currentHourTime) || lastUpdateTime.After(currentHourTime) {
			return ctrl.Result{Requeue: true, RequeueAfter: time.Until(currentHourTime.Add(1*time.Hour + 10*time.Minute))}, nil
		}
		// 24小时内的数据，从上次更新时间开始计算，否则从当前时间起算
		if lastUpdateTime.After(currentHourTime.Add(-24 * time.Hour)) {
			queryTime = lastUpdateTime
		}
	}

	// 计算上次billing到当前的时间之间的整点，左开右闭
	for t := queryTime.Truncate(time.Hour).Add(time.Hour); t.Before(currentHourTime) || t.Equal(currentHourTime); t = t.Add(time.Hour) {
		for i := range nsList {
			if err = r.billingWithHourTime(ctx, t.UTC(), nsList[i], ns.Name, dbClient); err != nil {
				r.Logger.Error(err, "billing with hour time failed", "time", t.Format(time.RFC3339))
				return ctrl.Result{}, err
			}
		}
	}
	return ctrl.Result{Requeue: true, RequeueAfter: time.Until(currentHourTime.Add(1*time.Hour + 10*time.Minute))}, nil
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

func (r *BillingReconciler) billingWithHourTime(ctx context.Context, queryTime time.Time, ns string, ownNs string, dbClient database.Interface) error {
	r.Logger.Info("queryTime", "queryTime", queryTime.Format(time.RFC3339), "ownNs", ownNs, "namespace", ns)
	billing, err := dbClient.GetMeteringOwnerTimeResult(queryTime, []string{ns}, nil)
	if err != nil {
		return fmt.Errorf("get metering owner time result failed: %w", err)
	}
	if billing != nil {
		if billing.Amount != 0 {
			id, err := gonanoid.New(12)
			if err != nil {
				return fmt.Errorf("create id failed: %w", err)
			}
			// create accountbalance
			accountBalance := v12.AccountBalance{
				ObjectMeta: metav1.ObjectMeta{
					Name:      getUsername(ownNs) + ns + "-" + queryTime.Format("20060102150405"),
					Namespace: r.AccountSystemNamespace,
				},
				Spec: v12.AccountBalanceSpec{
					Time: metav1.Time{Time: queryTime},
					AccountBalanceSpecInline: v12.AccountBalanceSpecInline{
						Namespace: ns,
						OrderID:   id,
						Amount:    billing.Amount,
						Costs:     billing.Costs,
						Owner:     getUsername(ownNs),
						Type:      v12.Consumption,
					},
				},
			}
			// ignore already exists error
			if err := r.Create(ctx, &accountBalance); client.IgnoreAlreadyExists(err) != nil {
				return fmt.Errorf("create accountbalance failed: %w", err)
			}
		} else {
			r.Logger.Info("billing amount is zero", "billingResult", billing)
		}
	} else {
		r.Logger.Info("billing is nil", "queryTime", queryTime.Format(time.RFC3339))
	}
	return nil
}

func (r *BillingReconciler) initDB() error {
	dbCtx := context.Background()
	mongoClient, err := database.NewMongoDB(dbCtx, r.mongoURI)
	if err != nil {
		r.Logger.Error(err, "connect mongo client failed")
		return err
	}
	defer func() {
		err := mongoClient.Disconnect(dbCtx)
		if err != nil {
			r.Logger.V(5).Info("disconnect mongo client failed", "err", err)
		}
	}()
	return mongoClient.CreateBillingIfNotExist()
}

// SetupWithManager sets up the controller with the Manager.
func (r *BillingReconciler) SetupWithManager(mgr ctrl.Manager, rateOpts controller.Options) error {
	if r.mongoURI = os.Getenv(database.MongoURI); r.mongoURI == "" {
		return fmt.Errorf("env %s is empty", database.MongoURI)
	}
	r.Logger = ctrl.Log.WithName("controller").WithName("Billing")
	if err := r.initDB(); err != nil {
		r.Logger.Error(err, "init db failed")
	}
	r.AccountSystemNamespace = os.Getenv(ACCOUNTNAMESPACEENV)
	if r.AccountSystemNamespace == "" {
		r.AccountSystemNamespace = DEFAULTACCOUNTNAMESPACE
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
