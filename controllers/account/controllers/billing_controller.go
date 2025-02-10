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

	"k8s.io/client-go/rest"

	"k8s.io/client-go/kubernetes/scheme"

	"github.com/labring/sealos/controllers/pkg/utils/env"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"

	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/labring/sealos/controllers/pkg/types"

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
	if err := r.ExecuteBillingTask(); err != nil {
		r.Logger.Error(err, "failed to execute billing task")
	}
	defer func() {
		r.Logger.Info("stop billing reconcile", "time", time.Now().Format(time.RFC3339))
	}()
	now := time.Now()
	nextHour := now.Truncate(time.Hour).Add(time.Hour).Add(5 * time.Minute)
	r.Logger.Info("next billing reconcile time", "time", nextHour.Format(time.RFC3339))
	time.Sleep(nextHour.Sub(now))

	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()
	for {
		if err := r.ExecuteBillingTask(); err != nil {
			r.Logger.Error(err, "failed to execute billing task")
		}
		select {
		case <-ticker.C:
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
	DBClient        database.Account
	AccountV2       database.AccountV2
	Properties      *resources.PropertyTypeLS
	concurrentLimit int64
}

func (r *BillingReconciler) ExecuteBillingTask() error {
	r.Logger.Info("start billing reconcile", "time", time.Now().Format(time.RFC3339))
	ownerListMap, err := r.getRecentUsedOwners()
	if err != nil {
		return fmt.Errorf("failed to get the owner list of the recently used resource: %w", err)
	}
	err = r.reconcileOwnerListBatch(ownerListMap, env.GetIntEnvWithDefault("BILLING_RECONCILE_BATCH_COUNT", 200), time.Now(), r.reconcileOwnerList)
	if err != nil {
		return fmt.Errorf("failed to reconcile owner list batch: %w", err)
	}
	r.Logger.Info("finish billing reconcile", "time", time.Now().Format(time.RFC3339))
	return nil
}

func (r *BillingReconciler) reconcileOwnerList(ownerListMap map[string][]string, now time.Time) error {
	endHourTime := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, time.Local).UTC()
	startHourTime := endHourTime.Add(-1 * time.Hour)
	var ownerList, failedList []string
	for owner := range ownerListMap {
		ownerList = append(ownerList, owner)
	}
	updateOwnerList, err := r.DBClient.GetOwnersRecentUpdates(ownerList, endHourTime)
	if err != nil {
		return fmt.Errorf("get owners without recent updates failed: %w", err)
	}

	// remove the owner that does not need to be updated
	for _, owner := range updateOwnerList {
		delete(ownerListMap, owner)
	}
	r.Logger.Info("get owners recent updates", "already update owner count", len(updateOwnerList), "remaining owner count", len(ownerListMap))

	ownerBillings, err := r.DBClient.GenerateBillingData(startHourTime, endHourTime, r.Properties, ownerListMap)
	if err != nil {
		return fmt.Errorf("generate billing data failed: %w", err)
	}
	r.Logger.Info("generate billing data", "count", len(ownerBillings))
	for owner, billings := range ownerBillings {
		amount := int64(0)
		orderIDs := make([]string, 0, len(billings))
		for _, billing := range billings {
			amount += billing.Amount
			orderIDs = append(orderIDs, billing.OrderID)
		}
		if err = r.DBClient.SaveBillings(billings...); err != nil {
			r.Logger.Error(err, "save billings failed", "owner", owner, "amount", amount)
			failedList = append(failedList, owner)
			continue
		}
		if err := r.rechargeBalance(owner, amount); err != nil {
			r.Logger.Error(err, "recharge balance failed", "owner", owner, "amount", amount)
			failedList = append(failedList, owner)
			if err := r.DBClient.UpdateBillingStatus(orderIDs, resources.Unsettled); err != nil {
				r.Logger.Error(err, "update billing unsettled status failed", "orderIDs", orderIDs)
			}
		}
	}
	if len(failedList) > 0 {
		r.Logger.Error(fmt.Errorf("failed to reconcile owner list: %v", failedList), "failed to reconcile owner list")
	}
	return nil
}

// reconcileOwnerListBatch process ownerlistmap in batch mode
func (r *BillingReconciler) reconcileOwnerListBatch(
	ownerListMap map[string][]string, // The owner -> namespaces mapping needs to be handled
	batchSize int, // number of owners processed per batch
	now time.Time, // current time
	reconcileFunc func(map[string][]string, time.Time) error, // processing function
) error {
	if batchSize <= 0 {
		return fmt.Errorf("batch size must be greater than zero")
	}

	owners := make([]string, 0, len(ownerListMap)) // store all owners
	for owner := range ownerListMap {
		owners = append(owners, owner)
	}

	total := len(owners)
	for i := 0; i < total; i += batchSize {
		end := i + batchSize
		if end > total {
			end = total
		}

		batchOwners := owners[i:end] // the owner list of the current batch
		batchOwnerMap := make(map[string][]string, len(batchOwners))
		for _, owner := range batchOwners {
			batchOwnerMap[owner] = ownerListMap[owner] // example retrieve a namespace
		}
		// call processing logic
		if err := reconcileFunc(batchOwnerMap, now); err != nil {
			return fmt.Errorf("failed to reconcile batch from %d to %d: %w", i, end, err)
		}
		r.Logger.Info("reconcile batch", "from", i, "to", end)
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

func (r *BillingReconciler) getRecentUsedOwners() (map[string][]string, error) {
	now := time.Now()
	endHourTime := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, time.Local).UTC()
	startHourTime := endHourTime.Add(-1 * time.Hour)
	namespaceList, err := r.DBClient.GetTimeUsedNamespaceList(startHourTime, endHourTime)
	if err != nil {
		return nil, fmt.Errorf("get recent owners failed: %w", err)
	}
	nsToOwnerMap, err := GetAllUser()
	if err != nil {
		return nil, fmt.Errorf("get all user failed: %w", err)
	}
	r.Logger.Info("get owner and namespace", "owner count", len(nsToOwnerMap), "namespace count", len(namespaceList))
	usedOwnerList := make(map[string][]string)
	for _, ns := range namespaceList {
		if owner, ok := nsToOwnerMap[ns]; ok {
			if _, ok := usedOwnerList[owner]; !ok {
				usedOwnerList[owner] = []string{}
			}
			usedOwnerList[owner] = append(usedOwnerList[owner], ns)
		}
	}
	r.Logger.Info("get all user", "count", len(usedOwnerList))
	return usedOwnerList, nil
}

func getUsername(namespace string) string {
	return strings.TrimPrefix(namespace, UserNamespacePrefix)
}

func (r *BillingReconciler) Init() error {
	r.Logger = ctrl.Log.WithName("controller").WithName("Billing")
	if err := r.DBClient.CreateBillingIfNotExist(); err != nil {
		return fmt.Errorf("create billing collection failed: %w", err)
	}
	r.concurrentLimit = env.GetInt64EnvWithDefault("BILLING_CONCURRENT_LIMIT", 100)
	return nil
}

// map[namespace]owner
func GetAllUser() (map[string]string, error) {
	err := userv1.AddToScheme(scheme.Scheme)
	if err != nil {
		return nil, fmt.Errorf("unable to add scheme: %v", err)
	}
	config, err := rest.InClusterConfig()
	if err != nil {
		return nil, fmt.Errorf("unable to build config: %v", err)
	}
	//TODO from cluster config
	//config, err := clientcmd.BuildConfigFromFlags("", os.Getenv("KUBECONFIG"))
	//if err != nil {
	//	return nil, fmt.Errorf("unable to build config: %v", err)
	//}
	k8sClt, err := client.New(config, client.Options{Scheme: scheme.Scheme})
	if err != nil {
		return nil, fmt.Errorf("unable to create client: %v", err)
	}
	nsToOwnerMap := make(map[string]string)

	listOpts := &client.ListOptions{
		Limit: 5000,
	}
	for {
		userMetaList := &metav1.PartialObjectMetadataList{}
		userMetaList.SetGroupVersionKind(userv1.GroupVersion.WithKind("UserList"))

		if err := k8sClt.List(context.Background(), userMetaList, listOpts); err != nil {
			return nil, fmt.Errorf("failed to list instances: %v", err)
		}

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
