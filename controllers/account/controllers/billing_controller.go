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
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/labring/sealos/controllers/pkg/utils/maps"

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

var DebtUserMap *maps.ConcurrentNullValueMap
var SubscriptionWorkspaceMap *maps.ConcurrentNullValueMap

func (r *BillingTaskRunner) Start(ctx context.Context) error {
	defer func() {
		r.Logger.Info("stopping billing reconcile", "time", time.Now().Format(time.RFC3339))
	}()

	for {
		select {
		case <-ctx.Done():
			return nil
		default:
			now := time.Now()
			minutesLeft := 60 - now.Minute()

			// Execute if 30 or more minutes remain, else wait for next hour
			if minutesLeft >= 30 {
				if err := r.ExecuteBillingTask(); err != nil {
					r.Logger.Error(err, "failed to execute billing task")
				}
			}

			// Calculate sleep duration to next hour + 5 minutes
			nextHour := now.Truncate(time.Hour).Add(time.Hour).Add(5 * time.Minute)
			sleepDuration := nextHour.Sub(now)

			r.Logger.Info("next billing reconcile time", "time", nextHour.Format(time.RFC3339))

			// Sleep until next scheduled time or context cancellation
			select {
			case <-time.After(sleepDuration):
				continue
			case <-ctx.Done():
				return nil
			}
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
	DBClient             database.Account
	AccountV2            database.AccountV2
	Properties           *resources.PropertyTypeLS
	reconcileBillingFunc func(owner string, billings []*resources.Billing) error
	concurrentLimit      int64
	DebtUserMap          *maps.ConcurrentMap
}

func (r *BillingReconciler) ExecuteBillingTask() error {
	r.Logger.Info("start billing reconcile", "time", time.Now().Format(time.RFC3339))
	DebtUserMap = maps.NewConcurrentNullValueMap()
	SubscriptionWorkspaceMap = maps.NewConcurrentNullValueMap()
	var users []string
	if err := r.AccountV2.GetGlobalDB().Model(&types.Debt{}).Where("account_debt_status IN (?, ?, ?) ", types.DebtPeriod, types.DebtDeletionPeriod, types.FinalDeletionPeriod).
		Distinct("user_uid").Pluck("user_uid", &users).Error; err != nil {
		return fmt.Errorf("failed to query unique users: %w", err)
	}
	DebtUserMap.Set(users...)
	var subscriptionWorkspaces []string
	if err := r.AccountV2.GetGlobalDB().Model(&types.WorkspaceSubscription{}).Where("region_domain = ?", r.AccountV2.GetLocalRegion().Domain).Pluck("workspace", &subscriptionWorkspaces).Error; err != nil {
		return fmt.Errorf("failed to query workspace subscriptions: %w", err)
	}
	SubscriptionWorkspaceMap.Set(subscriptionWorkspaces...)
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
	var ownerList []string
	for owner := range ownerListMap {
		ownerList = append(ownerList, owner)
	}
	ownersRecentUpdates, err := r.DBClient.GetOwnersRecentUpdates(ownerList, endHourTime)
	if err != nil {
		return fmt.Errorf("get owners without recent updates failed: %w", err)
	}

	// remove the owner that does not need to be updated; final State The user deletes the service at any time and does not perform billing processing
	for _, owner := range append(ownersRecentUpdates, DebtUserMap.GetAllKey()...) {
		delete(ownerListMap, owner)
	}
	r.Logger.Info("get owners recent updates", "already update owner count", len(ownersRecentUpdates), "remaining owner count", len(ownerListMap))

	ownerBillings, err := r.DBClient.GenerateBillingData(startHourTime, endHourTime, r.Properties, ownerListMap)
	if err != nil {
		return fmt.Errorf("generate billing data failed: %w", err)
	}
	r.Logger.Info("generate billing data", "count", len(ownerBillings))

	type result struct {
		owner string
		err   error
	}
	workers := make(chan struct{}, r.concurrentLimit)
	resultChan := make(chan result, len(ownerBillings))
	var wg sync.WaitGroup
	for owner, billings := range ownerBillings {
		if len(billings) == 0 {
			continue
		}
		wg.Add(1)
		go func(owner string, billings []*resources.Billing) {
			defer wg.Done()
			workers <- struct{}{}
			defer func() {
				<-workers
			}()
			reconcileErr := r.reconcileBillingFunc(owner, billings)
			if reconcileErr != nil {
				r.Logger.Error(reconcileErr, "failed to reconcile owner", "owner", owner, "billings", billings)
			}
			resultChan <- result{owner: owner, err: reconcileErr}
		}(owner, billings)
	}
	wg.Wait()
	close(resultChan)
	var failedList []string
	for res := range resultChan {
		if res.err != nil {
			failedList = append(failedList, res.owner)
		}
	}
	if len(failedList) > 0 {
		r.Logger.Error(fmt.Errorf("failed to reconcile owner list: %v", failedList), "failed to reconcile owner list")
	}
	return nil
}

func (r *BillingReconciler) reconcileBilling(owner string, billings []*resources.Billing) error {
	amount := int64(0)
	orderIDs := make([]string, 0, len(billings))
	for _, billing := range billings {
		// TODO skip the billing of the subscription workspace: if billing.namespace is the subscription space, billing.Status= subscription, && skip amount ++
		// Only the traffic charges for the subscription space are processed, and no billing is required. The traffic charges are handled separately within the subscription
		if _, ok := SubscriptionWorkspaceMap.Get(billing.Namespace); ok {
			billing.Status = resources.Subscription
			continue
		}
		amount += billing.Amount
		orderIDs = append(orderIDs, billing.OrderID)
	}
	if err := r.DBClient.SaveBillings(billings...); err != nil {
		return fmt.Errorf("save billings failed: %w", err)
	}
	if err := r.rechargeBalance(owner, amount); err != nil {
		r.Logger.Error(err, "recharge balance failed", "owner", owner, "amount", amount)
		if updateErr := r.DBClient.UpdateBillingStatus(orderIDs, resources.Unsettled); updateErr != nil {
			r.Logger.Error(updateErr, "update billing unsettled status failed", "orderIDs", orderIDs)
		}
		return fmt.Errorf("recharge balance failed: %w", err)
	}
	return nil
}

func (r *BillingReconciler) reconcileBillingWithCredits(owner string, billings []*resources.Billing) error {
	amount := int64(0)
	orderIDs := make([]string, 0, len(billings))
	for _, billing := range billings {
		amount += billing.Amount
		orderIDs = append(orderIDs, billing.OrderID)
	}
	if amount <= 0 {
		return nil
	}
	if err := r.DBClient.SaveBillings(billings...); err != nil {
		return fmt.Errorf("save billings failed: %w", err)
	}
	if err := r.AccountV2.AddDeductionBalanceWithCredits(&types.UserQueryOpts{Owner: owner}, amount, orderIDs); err != nil {
		r.Logger.Error(err, "AddDeductionBalanceWithCredits failed", "owner", owner, "amount", amount)
		if updateErr := r.DBClient.UpdateBillingStatus(orderIDs, resources.Unsettled); updateErr != nil {
			r.Logger.Error(updateErr, "update billing unsettled status failed", "owner", owner, "amount", amount, "orderIDs", orderIDs)
		}
		return fmt.Errorf("recharge balance failed: %w", err)
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
				userUID, err := r.AccountV2.GetUserUID(&types.UserQueryOpts{Owner: owner, IgnoreEmpty: true})
				if err != nil {
					return nil, fmt.Errorf("get user uid failed: %w", err)
				}
				if userUID == uuid.Nil {
					r.Logger.Error(fmt.Errorf("user uid is nil"), "get user uid failed", "owner", owner)
					continue
				}
				_, inDebt := DebtUserMap.Get(userUID.String())
				if inDebt {
					//r.Logger.Info("user is in debt", "user uid", userUID.String())
					continue
				}
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
	r.concurrentLimit = env.GetInt64EnvWithDefault("BILLING_CONCURRENT_LIMIT", 10)
	r.reconcileBillingFunc = r.reconcileBilling
	if os.Getenv("CREDITS_ENABLED") == "true" || os.Getenv("SUBSCRIPTION_ENABLED") == "true" {
		r.reconcileBillingFunc = r.reconcileBillingWithCredits
	}
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
