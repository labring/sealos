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

	"github.com/labring/sealos/controllers/pkg/common"

	"sigs.k8s.io/controller-runtime/pkg/controller"

	"github.com/go-logr/logr"
	"github.com/labring/sealos/controllers/pkg/database"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/source"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
)

// BillingRecordQueryReconciler reconciles a BillingRecordQuery object
type BillingRecordQueryReconciler struct {
	client.Client
	Scheme     *runtime.Scheme
	Logger     logr.Logger
	MongoDBURI string
}

//+kubebuilder:rbac:groups=account.sealos.io,resources=billingrecordqueries,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=billingrecordqueries/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=account.sealos.io,resources=billingrecordqueries/finalizers,verbs=update
//+kubebuilder:rbac:groups=account.sealos.io,resources=pricequeries,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=pricequeries/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=account.sealos.io,resources=pricequeries/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the BillingRecordQuery object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.11.2/pkg/reconcile
func (r *BillingRecordQueryReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	_ = log.FromContext(ctx)

	dbCtx := context.Background()
	dbClient, err := database.NewMongoDB(dbCtx, r.MongoDBURI)
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

	priceQuery := &accountv1.PriceQuery{}
	err = r.Get(ctx, req.NamespacedName, priceQuery)
	if err == nil {
		return r.ReconcilePriceQuery(ctx, priceQuery, dbClient)
	} else if client.IgnoreNotFound(err) != nil {
		return ctrl.Result{}, err
	}

	billingRecordQuery := &accountv1.BillingRecordQuery{}
	err = r.Get(ctx, req.NamespacedName, billingRecordQuery)
	if err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if time.Since(billingRecordQuery.CreationTimestamp.Time) > (3 * time.Minute) {
		err = r.Delete(ctx, billingRecordQuery)
		return ctrl.Result{}, err
	}
	//check options

	if err = CheckOpts(billingRecordQuery); err != nil {
		//TODO update status
		return ctrl.Result{}, err
	}

	err = dbClient.QueryBillingRecords(billingRecordQuery, getUsername(billingRecordQuery.Namespace))
	if err != nil {
		r.Logger.Error(err, "query billing records failed")
		return ctrl.Result{Requeue: true}, err
	}
	if err = r.Status().Update(ctx, billingRecordQuery); err != nil {
		r.Logger.Error(err, "update billing record query status failed")
		return ctrl.Result{Requeue: true}, err
	}
	return ctrl.Result{Requeue: true, RequeueAfter: time.Minute * 4}, nil
}

func CheckOpts(billingRecordQuery *accountv1.BillingRecordQuery) error {
	if billingRecordQuery.Spec.Page < 1 || billingRecordQuery.Spec.PageSize < 1 {
		return fmt.Errorf("page and pageSize must be greater than 0")
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *BillingRecordQueryReconciler) SetupWithManager(mgr ctrl.Manager, rateOpts controller.Options) error {
	if r.MongoDBURI = os.Getenv(database.MongoURI); r.MongoDBURI == "" {
		return fmt.Errorf("env %s is empty", database.MongoURI)
	}
	r.Logger = log.Log.WithName("billingrecordquery-controller")
	return ctrl.NewControllerManagedBy(mgr).
		For(&accountv1.BillingRecordQuery{}).
		Watches(&source.Kind{Type: &accountv1.PriceQuery{}}, &handler.EnqueueRequestForObject{}).
		WithOptions(rateOpts).
		Complete(r)
}

func (r *BillingRecordQueryReconciler) ReconcilePriceQuery(ctx context.Context, priceQuery *accountv1.PriceQuery, dbClient database.Interface) (ctrl.Result, error) {
	// TODO query price
	if time.Since(priceQuery.CreationTimestamp.Time) > (3 * time.Minute) {
		err := r.Delete(ctx, priceQuery)
		return ctrl.Result{}, err
	}
	pricesMap, err := dbClient.GetAllPricesMap()
	if err != nil {
		r.Logger.Error(err, "get all prices failed")
		pricesMap = common.DefaultPrices
	}
	priceQuery.Status.BillingRecords = make([]accountv1.BillingRecord, 0)
	for property, v := range pricesMap {
		priceQuery.Status.BillingRecords = append(priceQuery.Status.BillingRecords, accountv1.BillingRecord{
			ResourceType: property,
			Price:        v.Price,
		})
	}
	if err = r.Status().Update(ctx, priceQuery); err != nil {
		r.Logger.Error(err, "update price query status failed")
		return ctrl.Result{Requeue: true}, err
	}
	return ctrl.Result{Requeue: true, RequeueAfter: time.Minute * 4}, err
}
