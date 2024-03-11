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
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/labring/sealos/controllers/pkg/types"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"

	"github.com/go-logr/logr"

	"github.com/labring/sealos/controllers/pkg/resources"

	"github.com/labring/sealos/controllers/pkg/database"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
)

// BillingInfoQueryReconciler reconciles a BillingInfoQuery object
type BillingInfoQueryReconciler struct {
	client.Client
	logr.Logger
	Scheme   *runtime.Scheme
	DBClient database.Account
	//TODO init
	AccountV2              database.AccountV2
	AccountSystemNamespace string
	Properties             *resources.PropertyTypeLS
	propertiesQuery        []accountv1.PropertyQuery
	Activities             types.Activities
	DefaultDiscount        types.RechargeDiscount
	QueryFuncMap           map[string]func(context.Context, ctrl.Request, *accountv1.BillingInfoQuery) (string, error)
}

//+kubebuilder:rbac:groups=account.sealos.io,resources=billinginfoqueries,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=billinginfoqueries/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=account.sealos.io,resources=billinginfoqueries/finalizers,verbs=update

func (r *BillingInfoQueryReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctl ctrl.Result, err error) {
	query := &accountv1.BillingInfoQuery{}
	if err = r.Get(ctx, req.NamespacedName, query); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	if err := r.deleteTimeoutQueryCRList(ctx); err != nil {
		r.Logger.Error(err, "delete timeout query error")
	}
	r.reconcileQuery(ctx, req, query)

	return ctrl.Result{}, r.Status().Update(ctx, query)
}

func (r *BillingInfoQueryReconciler) reconcileQuery(ctx context.Context, req ctrl.Request, query *accountv1.BillingInfoQuery) {
	var err error
	queryFunc := r.QueryFuncMap[strings.ToLower(query.Spec.QueryType)]
	if queryFunc == nil {
		query.Status.Status = accountv1.Failed
		query.Status.StatusDetails = fmt.Sprintf("query type %s not supported", query.Spec.QueryType)
		return
	}
	if query.Status.Result, err = queryFunc(ctx, req, query); err != nil {
		query.Status.Status = accountv1.Failed
		query.Status.StatusDetails = err.Error()
		return
	}
	query.Status.Status = accountv1.Completed
}

// timeout five minutes
func (r *BillingInfoQueryReconciler) deleteTimeoutQueryCRList(ctx context.Context) error {
	queryList := &accountv1.BillingInfoQueryList{}
	err := r.List(ctx, queryList)
	if err != nil {
		return err
	}

	for _, query := range queryList.Items {
		if time.Since(query.CreationTimestamp.Time) > time.Minute*6 {
			if err := r.Delete(ctx, &query); client.IgnoreNotFound(err) != nil {
				return fmt.Errorf("delete billinginfoquery error: %v", err)
			}
		}
	}
	return nil
}

func (r *BillingInfoQueryReconciler) NamespacesHistoryQuery(ctx context.Context, req ctrl.Request, _ *accountv1.BillingInfoQuery) (result string, err error) {
	user := &userv1.User{}
	if err = r.Get(ctx, client.ObjectKey{Namespace: req.Namespace, Name: getUsername(req.Namespace)}, user); err != nil {
		return "", fmt.Errorf("get user failed: %w", err)
	}
	var nsList []string
	owner, ok := user.GetAnnotations()[userv1.UserAnnotationOwnerKey]
	if ok {
		nsList, err = r.DBClient.GetBillingHistoryNamespaces(nil, nil, int(accountv1.QueryAllType), owner)
		if err != nil {
			return "", fmt.Errorf("get billing history namespaces failed: %w", err)
		}
	}

	data, err := json.Marshal(nsList)
	if err != nil {
		return "", fmt.Errorf("marshal billing history namespaces failed: %w", err)
	}
	return string(data), nil
}

func (r *BillingInfoQueryReconciler) PropertiesQuery(_ context.Context, _ ctrl.Request, _ *accountv1.BillingInfoQuery) (result string, err error) {
	data, err := json.Marshal(r.propertiesQuery)
	if err != nil {
		return "", fmt.Errorf("marshal properties query failed: %w", err)
	}
	return string(data), nil
}

func (r *BillingInfoQueryReconciler) AppTypeQuery(_ context.Context, _ ctrl.Request, _ *accountv1.BillingInfoQuery) (result string, err error) {
	var appTypeList []string
	for appType := range resources.AppType {
		appTypeList = append(appTypeList, appType)
	}
	data, err := json.Marshal(appTypeList)
	if err != nil {
		return "", fmt.Errorf("marshal type query failed: %w", err)
	}
	return string(data), nil
}

func (r *BillingInfoQueryReconciler) RechargeQuery(_ context.Context, _ ctrl.Request, billingInfoQuery *accountv1.BillingInfoQuery) (result string, err error) {
	//TODO get owner
	userDiscount, err := r.AccountV2.GetUserAccountRechargeDiscount(&types.UserQueryOpts{Owner: getUsername(billingInfoQuery.Namespace)})
	if err != nil {
		return "", fmt.Errorf("parse user activities failed: %w", err)
	}
	if userDiscount == nil || len(userDiscount.DiscountRates) == 0 || len(userDiscount.DiscountSteps) == 0 {
		userDiscount = &r.DefaultDiscount
	}
	data, err := json.Marshal(userDiscount)
	if err != nil {
		return "", fmt.Errorf("marshal recharge discount failed: %w", err)
	}
	return string(data), nil
}

func (r *BillingInfoQueryReconciler) ConvertPropertiesToQuery() error {
	r.propertiesQuery = make([]accountv1.PropertyQuery, 0)
	for _, types := range r.Properties.Types {
		property := accountv1.PropertyQuery{
			Name:      types.Name,
			UnitPrice: types.UnitPrice,
			Unit:      types.UnitString,
			Alias:     types.Alias,
		}
		r.propertiesQuery = append(r.propertiesQuery, property)
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *BillingInfoQueryReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Logger = ctrl.Log.WithName("controllers").WithName("BillingInfoQuery")
	if err := r.ConvertPropertiesToQuery(); err != nil {
		return fmt.Errorf("convert properties to query failed: %w", err)
	}
	r.QueryFuncMap = make(map[string]func(context.Context, ctrl.Request, *accountv1.BillingInfoQuery) (string, error), 3)
	r.QueryFuncMap[strings.ToLower(accountv1.QueryTypeNamespacesHistory)] = r.NamespacesHistoryQuery
	r.QueryFuncMap[strings.ToLower(accountv1.QueryTypeProperties)] = r.PropertiesQuery
	r.QueryFuncMap[strings.ToLower(accountv1.QueryTypeAppType)] = r.AppTypeQuery
	r.QueryFuncMap[strings.ToLower(accountv1.QueryTypeRecharge)] = r.RechargeQuery
	return ctrl.NewControllerManagedBy(mgr).
		For(&accountv1.BillingInfoQuery{}).
		Complete(r)
}
