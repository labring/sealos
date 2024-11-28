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

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/labring/sealos/controllers/pkg/types"

	v12 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/resources"

	"github.com/go-logr/logr"

	"github.com/labring/sealos/controllers/pkg/database"

	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type BillingTaskRunner struct {
	*BillingReconciler
}

func (r *BillingTaskRunner) Start(ctx context.Context) error {
	r.Logger.Info("start billing reconcile", "time", time.Now().Format(time.RFC3339))
	if err := r.ExecuteBillingTask(); err != nil {
		r.Logger.Error(err, "failed to execute billing task")
	}
	now := time.Now()
	nextHour := now.Truncate(time.Hour).Add(time.Hour)
	r.Logger.Info("next billing reconcile time", "time", nextHour.Format(time.RFC3339))
	time.Sleep(nextHour.Sub(now))

	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			r.Logger.Info("start billing reconcile", "time", time.Now().Format(time.RFC3339))
			if err := r.ExecuteBillingTask(); err != nil {
				r.Logger.Error(err, "failed to execute billing task")
			}
		case <-ctx.Done():
			return nil
		}
	}
}

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

func (r *BillingReconciler) ExecuteBillingTask() error {
	ownerList, ownerToNsMap, err := r.getRecentUsedOwners()
	if err != nil {
		r.Logger.Error(err, "failed to get the owner list of the recently used resource")
		return err
	}
	now := time.Now()
	for _, owner := range ownerList {
		if err := r.reconcileOwner(owner, ownerToNsMap[owner], now); err != nil {
			r.Logger.Error(err, "reconcile owner failed", "owner", owner)
			continue
		}
	}
	return nil
}

func (r *BillingReconciler) reconcileOwner(owner string, nsList []string, now time.Time) error {
	currentHourTime := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, time.Local).UTC()
	queryTime := currentHourTime.Add(-1 * time.Hour)
	if exist, lastUpdateTime, _ := r.DBClient.GetBillingLastUpdateTime(owner, v12.Consumption); exist {
		if lastUpdateTime.Equal(currentHourTime) || lastUpdateTime.After(currentHourTime) {
			return nil
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
			return fmt.Errorf("generate billing data failed: %w", err)
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
			return fmt.Errorf("recharge balance failed: %w", err)
		}
		r.Logger.V(1).Info("success recharge balance", "owner", owner, "amount", consumAmount)
	}
	return nil
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

func (r *BillingReconciler) getRecentUsedOwners() ([]string, map[string][]string, error) {
	now := time.Now()
	endHourTime := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, time.Local).UTC()
	startHourTime := endHourTime.Add(-1 * time.Hour)
	namespaceList, err := r.DBClient.GetTimeUsedNamespaceList(startHourTime, endHourTime)
	if err != nil {
		return nil, nil, fmt.Errorf("get recent owners failed: %w", err)
	}
	nsToOwnerMap, err := r.getAllUser()
	if err != nil {
		return nil, nil, fmt.Errorf("get all user failed: %w", err)
	}
	usedOwnerList := []string{}
	ownerUsedNSMap := make(map[string][]string)
	for _, ns := range namespaceList {
		if owner, ok := nsToOwnerMap[ns]; ok {
			usedOwnerList = append(usedOwnerList, owner)
			ownerUsedNSMap[owner] = append(ownerUsedNSMap[owner], ns)
		}
	}
	return usedOwnerList, ownerUsedNSMap, nil
}

func getUsername(namespace string) string {
	return strings.TrimPrefix(namespace, UserNamespacePrefix)
}

func (r *BillingReconciler) Init() error {
	r.Logger = ctrl.Log.WithName("controller").WithName("Billing")
	if err := r.DBClient.CreateBillingIfNotExist(); err != nil {
		return fmt.Errorf("create billing collection failed: %w", err)
	}
	return nil
}

// map[namespace]owner
func (r *BillingReconciler) getAllUser() (map[string]string, error) {
	nsToOwnerMap := make(map[string]string)

	listOpts := &client.ListOptions{
		Limit: 1000,
	}
	for {
		userMetaList := &metav1.PartialObjectMetadataList{}
		userMetaList.SetGroupVersionKind(userv1.GroupVersion.WithKind("UserList"))

		if err := r.Client.List(context.Background(), userMetaList, listOpts); err != nil {
			return nil, fmt.Errorf("failed to list instances: %v", err)
		}

		fmt.Printf("Retrieved %d users\n", len(userMetaList.Items))

		for _, user := range userMetaList.Items {
			owner := user.Annotations[userv1.UserLabelOwnerKey]
			if owner == "" {
				continue
			}
			nsToOwnerMap["ns-"+user.Name] = owner
		}

		token := userMetaList.GetContinue()
		if token == "" {
			break
		}
		listOpts.Continue = token
	}
	return nsToOwnerMap, nil
}
