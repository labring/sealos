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
	"errors"
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/go-logr/logr"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils/env"
	"github.com/labring/sealos/controllers/pkg/utils/maps"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type BillingTaskRunner struct {
	*BillingReconciler
}

func (r *BillingTaskRunner) NeedLeaderElection() bool { return true }

const (
	billingMonitorDelay = 5 * time.Minute
	billingRetryDelay   = time.Minute
)

var (
	DebtUserMap              *maps.ConcurrentNullValueMap
	SubscriptionWorkspaceMap *maps.ConcurrentNullValueMap
)

func (r *BillingTaskRunner) Start(ctx context.Context) error {
	defer func() {
		r.Info("stopping billing reconcile", "time", time.Now().Format(time.RFC3339))
	}()

	for {
		if err := ctx.Err(); err != nil {
			return nil
		}
		target := latestReadyBillingHour(time.Now())
		if err := r.ExecuteBillingTasksUntil(target); err != nil {
			r.Error(err, "failed to execute billing tasks", "target", target)
			if !waitForBillingRun(ctx, billingRetryDelay) {
				return nil
			}
			continue
		}

		// A long catch-up may make another hour ready while the task is running.
		if latestReadyBillingHour(time.Now()).After(target) {
			continue
		}
		nextRun := target.Add(time.Hour).Add(billingMonitorDelay)
		r.Info("next billing reconcile time", "time", nextRun.Format(time.RFC3339))
		if !waitForBillingRun(ctx, time.Until(nextRun)) {
			return nil
		}
	}
}

func latestReadyBillingHour(now time.Time) time.Time {
	return now.Add(-billingMonitorDelay).Truncate(time.Hour).UTC()
}

func billingHoursAfter(checkpoint, target time.Time) []time.Time {
	var hours []time.Time
	for hour := checkpoint.UTC().Truncate(time.Hour).Add(time.Hour); !hour.After(target); hour = hour.Add(time.Hour) {
		hours = append(hours, hour)
	}
	return hours
}

func waitForBillingRun(ctx context.Context, delay time.Duration) bool {
	if delay < 0 {
		delay = 0
	}
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-timer.C:
		return true
	case <-ctx.Done():
		return false
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
	DBClient               database.Account
	AccountV2              database.AccountV2
	Properties             *resources.PropertyTypeLS
	reconcileBillingFunc   func(owner string, billings []*resources.Billing) error
	executeBillingHourFunc func(time.Time) error
	concurrentLimit        int64
	DebtUserMap            *maps.ConcurrentMap
}

func (r *BillingReconciler) ExecuteBillingTask() error {
	return r.ExecuteBillingTasksUntil(latestReadyBillingHour(time.Now()))
}

func (r *BillingReconciler) ExecuteBillingTasksUntil(target time.Time) error {
	target = target.UTC().Truncate(time.Hour)
	checkpoint, exists, err := r.DBClient.GetBillingCheckpoint()
	if err != nil {
		return fmt.Errorf("get billing checkpoint: %w", err)
	}
	if !exists {
		checkpoint = target.Add(-time.Hour)
	}
	for _, billingTime := range billingHoursAfter(checkpoint, target) {
		execute := r.ExecuteBillingTaskAt
		if r.executeBillingHourFunc != nil {
			execute = r.executeBillingHourFunc
		}
		if err := execute(billingTime); err != nil {
			return fmt.Errorf(
				"reconcile billing hour %s: %w",
				billingTime.Format(time.RFC3339),
				err,
			)
		}
		if err := r.DBClient.SaveBillingCheckpoint(billingTime); err != nil {
			return fmt.Errorf(
				"save billing checkpoint for %s: %w",
				billingTime.Format(time.RFC3339),
				err,
			)
		}
	}
	return nil
}

func (r *BillingReconciler) ExecuteBillingTaskAt(endHourTime time.Time) error {
	endHourTime = endHourTime.UTC().Truncate(time.Hour)
	taskStartedAt := time.Now()
	r.Info("start billing reconcile", "billingTime", endHourTime.Format(time.RFC3339))
	DebtUserMap = maps.NewConcurrentNullValueMap()
	SubscriptionWorkspaceMap = maps.NewConcurrentNullValueMap()
	if err := r.loadDebtUsersAt(endHourTime); err != nil {
		return err
	}
	ownerListMap, err := r.getRecentUsedOwnersAt(endHourTime)
	if err != nil {
		return fmt.Errorf("failed to get the owner list of the recently used resource: %w", err)
	}
	unsettledBillings, err := r.DBClient.GetUnsettledBillingsAt(endHourTime)
	if err != nil {
		return fmt.Errorf("failed to get unsettled billings: %w", err)
	}
	addUnsettledBillingOwners(ownerListMap, unsettledBillings)
	if err := r.loadSubscriptionWorkspacesAt(endHourTime, ownerListMap); err != nil {
		return err
	}
	if len(ownerListMap) == 0 {
		r.Info(
			"billing hour has no monitor-backed owners",
			"billingTime",
			endHourTime.Format(time.RFC3339),
		)
	}
	err = r.reconcileOwnerListBatch(
		ownerListMap,
		env.GetIntEnvWithDefault("BILLING_RECONCILE_BATCH_COUNT", 200),
		endHourTime,
		r.reconcileOwnerList,
	)
	if err != nil {
		return fmt.Errorf("failed to reconcile owner list batch: %w", err)
	}
	r.Info(
		"finish billing reconcile",
		"billingTime", endHourTime.Format(time.RFC3339),
		"duration", time.Since(taskStartedAt),
	)
	return nil
}

func (r *BillingReconciler) loadDebtUsersAt(endHourTime time.Time) error {
	effectiveTime := endHourTime.Add(-time.Nanosecond)
	db := r.AccountV2.GetGlobalDB()
	var debts []types.Debt
	if err := db.Model(&types.Debt{}).
		Where("created_at <= ?", effectiveTime).
		Find(&debts).Error; err != nil {
		return fmt.Errorf("query billing-period debts: %w", err)
	}

	var recordsAfter []types.DebtStatusRecord
	if err := db.Model(&types.DebtStatusRecord{}).
		Where("create_at > ?", effectiveTime).
		Order("create_at ASC").
		Find(&recordsAfter).Error; err != nil {
		return fmt.Errorf("query debt status after billing period: %w", err)
	}

	afterByUser := make(map[uuid.UUID]types.DebtStatusRecord, len(recordsAfter))
	for _, record := range recordsAfter {
		if _, exists := afterByUser[record.UserUID]; !exists {
			afterByUser[record.UserUID] = record
		}
	}
	var users []string
	for i := range debts {
		status := debtStatusAt(debts[i], afterByUser[debts[i].UserUID])
		if types.ContainDebtStatus(types.DebtStates, status) {
			users = append(users, debts[i].UserUID.String())
		}
	}
	DebtUserMap.Set(users...)
	return nil
}

func debtStatusAt(debt types.Debt, recordAfter types.DebtStatusRecord) types.DebtStatusType {
	if recordAfter.UserUID != uuid.Nil {
		return recordAfter.LastStatus
	}
	return debt.AccountDebtStatus
}

func (r *BillingReconciler) loadSubscriptionWorkspacesAt(
	endHourTime time.Time,
	ownerListMap map[string][]string,
) error {
	effectiveTime := endHourTime.Add(-time.Nanosecond)
	db := r.AccountV2.GetGlobalDB()
	regionDomain := r.AccountV2.GetLocalRegion().Domain
	workspaceSet := make(map[string]struct{})
	for _, workspaces := range ownerListMap {
		for _, workspace := range workspaces {
			workspaceSet[workspace] = struct{}{}
		}
	}
	workspaces := make([]string, 0, len(workspaceSet))
	for workspace := range workspaceSet {
		workspaces = append(workspaces, workspace)
	}
	if len(workspaces) == 0 {
		return nil
	}

	var subscriptions []types.WorkspaceSubscription
	if err := db.Model(&types.WorkspaceSubscription{}).
		Where(
			"region_domain = ? AND workspace IN ? AND create_at <= ?",
			regionDomain,
			workspaces,
			effectiveTime,
		).
		Find(&subscriptions).Error; err != nil {
		return fmt.Errorf("query billing-period workspace subscriptions: %w", err)
	}
	var periodTransactions []types.WorkspaceSubscriptionTransaction
	if err := db.Model(&types.WorkspaceSubscriptionTransaction{}).
		Where(
			"region_domain = ? AND workspace IN ? AND status = ? AND pay_status IN (?, ?) AND updated_at <= ?",
			regionDomain,
			workspaces,
			types.SubscriptionTransactionStatusCompleted,
			types.SubscriptionPayStatusPaid,
			types.SubscriptionPayStatusNoNeed,
			effectiveTime,
		).
		Find(&periodTransactions).Error; err != nil {
		return fmt.Errorf("query billing-period workspace subscription transactions: %w", err)
	}
	var terminalTransactions []types.WorkspaceSubscriptionTransaction
	if err := db.Model(&types.WorkspaceSubscriptionTransaction{}).
		Where(
			"region_domain = ? AND workspace IN ? AND status = ? AND operator IN (?, ?) AND updated_at <= ?",
			regionDomain,
			workspaces,
			types.SubscriptionTransactionStatusCompleted,
			types.SubscriptionTransactionTypeCanceled,
			types.SubscriptionTransactionTypeDeleted,
			effectiveTime,
		).
		Find(&terminalTransactions).Error; err != nil {
		return fmt.Errorf("query billing-period terminal subscription transactions: %w", err)
	}
	transactions := make(
		[]types.WorkspaceSubscriptionTransaction,
		0,
		len(periodTransactions)+len(terminalTransactions),
	)
	transactions = append(transactions, periodTransactions...)
	transactions = append(transactions, terminalTransactions...)

	workspaces, err := activeWorkspaceSubscriptionsAt(effectiveTime, subscriptions, transactions)
	if err != nil {
		return fmt.Errorf("resolve billing-period workspace subscriptions: %w", err)
	}
	SubscriptionWorkspaceMap.Set(workspaces...)
	return nil
}

func activeWorkspaceSubscriptionsAt(
	effectiveTime time.Time,
	subscriptions []types.WorkspaceSubscription,
	transactions []types.WorkspaceSubscriptionTransaction,
) ([]string, error) {
	active := make(map[string]struct{})
	terminalAt := make(map[string]time.Time)
	for i := range transactions {
		if !isWorkspaceSubscriptionTerminalTransaction(transactions[i], effectiveTime) {
			continue
		}
		previous, exists := terminalAt[transactions[i].Workspace]
		if !exists || transactions[i].UpdatedAt.After(previous) {
			terminalAt[transactions[i].Workspace] = transactions[i].UpdatedAt
		}
	}
	for i := range subscriptions {
		terminatedAt, terminated := terminalAt[subscriptions[i].Workspace]
		if workspaceSubscriptionCovers(subscriptions[i], effectiveTime) &&
			(!terminated || subscriptions[i].UpdateAt.After(terminatedAt)) {
			active[subscriptions[i].Workspace] = struct{}{}
		}
	}
	for i := range transactions {
		covers, err := workspaceSubscriptionTransactionCovers(transactions[i], effectiveTime)
		if err != nil {
			return nil, err
		}
		if !covers {
			continue
		}
		terminatedAt, terminated := terminalAt[transactions[i].Workspace]
		if !terminated || transactions[i].UpdatedAt.After(terminatedAt) {
			active[transactions[i].Workspace] = struct{}{}
		}
	}
	workspaces := make([]string, 0, len(active))
	for workspace := range active {
		workspaces = append(workspaces, workspace)
	}
	return workspaces, nil
}

func isWorkspaceSubscriptionTerminalTransaction(
	transaction types.WorkspaceSubscriptionTransaction,
	effectiveTime time.Time,
) bool {
	if transaction.Status != types.SubscriptionTransactionStatusCompleted ||
		transaction.UpdatedAt.After(effectiveTime) {
		return false
	}
	switch transaction.Operator {
	case types.SubscriptionTransactionTypeCanceled,
		types.SubscriptionTransactionTypeDeleted:
		return true
	default:
		return false
	}
}

func workspaceSubscriptionCovers(
	subscription types.WorkspaceSubscription,
	effectiveTime time.Time,
) bool {
	if subscription.CreateAt.After(effectiveTime) || subscription.UpdateAt.After(effectiveTime) {
		return false
	}
	endAt := subscription.CurrentPeriodEndAt
	if subscription.ExpireAt != nil && subscription.ExpireAt.Before(endAt) {
		endAt = *subscription.ExpireAt
	}
	if !subscription.CancelAtPeriodEnd && !subscription.CancelAt.IsZero() &&
		subscription.CancelAt.Before(endAt) {
		endAt = subscription.CancelAt
	}
	return !subscription.CurrentPeriodStartAt.After(effectiveTime) && endAt.After(effectiveTime)
}

func workspaceSubscriptionTransactionCovers(
	transaction types.WorkspaceSubscriptionTransaction,
	effectiveTime time.Time,
) (bool, error) {
	if transaction.Status != types.SubscriptionTransactionStatusCompleted ||
		(transaction.PayStatus != types.SubscriptionPayStatusPaid &&
			transaction.PayStatus != types.SubscriptionPayStatusNoNeed) ||
		transaction.UpdatedAt.After(effectiveTime) {
		return false, nil
	}
	switch transaction.Operator {
	case types.SubscriptionTransactionTypeCreated,
		types.SubscriptionTransactionTypeUpgraded,
		types.SubscriptionTransactionTypeDowngraded,
		types.SubscriptionTransactionTypeRenewed:
	default:
		return false, nil
	}
	period, err := types.ParsePeriod(transaction.Period)
	if err != nil {
		return false, fmt.Errorf(
			"parse subscription transaction %s period: %w", transaction.ID, err,
		)
	}
	return !transaction.UpdatedAt.After(effectiveTime) &&
		transaction.UpdatedAt.Add(period).After(effectiveTime), nil
}

func addUnsettledBillingOwners(
	ownerListMap map[string][]string,
	unsettled map[string][]*resources.Billing,
) {
	for owner, billings := range unsettled {
		namespaces := make(map[string]struct{}, len(ownerListMap[owner]))
		for _, namespace := range ownerListMap[owner] {
			namespaces[namespace] = struct{}{}
		}
		for _, billing := range billings {
			if _, exists := namespaces[billing.Namespace]; exists {
				continue
			}
			ownerListMap[owner] = append(ownerListMap[owner], billing.Namespace)
			namespaces[billing.Namespace] = struct{}{}
		}
	}
}

func (r *BillingReconciler) reconcileOwnerList(
	ownerListMap map[string][]string,
	now time.Time,
) error {
	endHourTime := now.UTC().Truncate(time.Hour)
	startHourTime := endHourTime.Add(-1 * time.Hour)
	ownerList := make([]string, 0, len(ownerListMap))
	for owner := range ownerListMap {
		ownerList = append(ownerList, owner)
	}
	existingStartedAt := time.Now()
	existingBillings, err := r.DBClient.GetOwnerBillingsAt(ownerList, endHourTime)
	if err != nil {
		return fmt.Errorf("get existing owner billings failed: %w", err)
	}
	r.Info(
		"get existing owner billings",
		"owner count", len(existingBillings),
		"duration", time.Since(existingStartedAt),
	)

	for _, owner := range DebtUserMap.GetAllKey() {
		delete(ownerListMap, owner)
	}

	generateStartedAt := time.Now()
	ownerBillings, err := r.DBClient.GenerateBillingData(
		startHourTime,
		endHourTime,
		r.Properties,
		ownerListMap,
	)
	if err != nil {
		return fmt.Errorf("generate billing data failed: %w", err)
	}
	r.Info(
		"generate billing data",
		"count", len(ownerBillings),
		"duration", time.Since(generateStartedAt),
	)
	classifyGeneratedBillings(ownerBillings)
	ownerBillings = pendingOwnerBillings(ownerBillings, existingBillings)

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
				r.Error(
					reconcileErr,
					"failed to reconcile owner",
					"owner",
					owner,
					"billings",
					billings,
				)
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
		return fmt.Errorf("failed to reconcile owners: %s", strings.Join(failedList, ","))
	}
	return nil
}

func billingBusinessKey(billing *resources.Billing) string {
	return fmt.Sprintf("%s\x00%d\x00%s", billing.Namespace, billing.AppType, billing.AppName)
}

func classifyGeneratedBillings(ownerBillings map[string][]*resources.Billing) {
	for _, billings := range ownerBillings {
		for _, billing := range billings {
			billing.Status = resources.Unsettled
			if _, ok := SubscriptionWorkspaceMap.Get(billing.Namespace); ok {
				billing.Status = resources.Subscription
			}
		}
	}
}

func pendingOwnerBillings(
	generated, existing map[string][]*resources.Billing,
) map[string][]*resources.Billing {
	pending := make(map[string][]*resources.Billing)
	for owner, billings := range existing {
		for _, billing := range billings {
			if billing.Status == resources.Unsettled &&
				strings.HasPrefix(billing.OrderID, "bh_") {
				pending[owner] = append(pending[owner], billing)
			}
		}
	}
	for owner, billings := range generated {
		existingByKey := make(map[string]*resources.Billing, len(existing[owner]))
		for _, billing := range existing[owner] {
			existingByKey[billingBusinessKey(billing)] = billing
		}
		for _, billing := range billings {
			if _, ok := existingByKey[billingBusinessKey(billing)]; ok {
				continue
			}
			pending[owner] = append(pending[owner], billing)
		}
	}
	return pending
}

func (r *BillingReconciler) reconcileBilling(owner string, billings []*resources.Billing) error {
	if err := r.DBClient.SaveBillings(billings...); err != nil {
		return fmt.Errorf("save billings failed: %w", err)
	}
	for _, billing := range billings {
		if billing.Status == resources.Subscription {
			if err := r.DBClient.UpdateBillingStatus(
				[]string{billing.OrderID}, resources.Subscription,
			); err != nil {
				return fmt.Errorf("mark billing %s subscription: %w", billing.OrderID, err)
			}
			continue
		}
		orderIDs := []string{billing.OrderID}
		if err := r.AccountV2.AddDeductionBalanceForBilling(
			&types.UserQueryOpts{Owner: owner}, billing.Amount, orderIDs,
		); err != nil {
			return fmt.Errorf("deduct billing %s balance: %w", billing.OrderID, err)
		}
		if err := r.DBClient.UpdateBillingStatus(orderIDs, resources.Settled); err != nil {
			return fmt.Errorf("mark billing %s settled: %w", billing.OrderID, err)
		}
	}
	return nil
}

func (r *BillingReconciler) reconcileBillingWithCredits(
	owner string,
	billings []*resources.Billing,
) error {
	if err := r.DBClient.SaveBillings(billings...); err != nil {
		return fmt.Errorf("save billings failed: %w", err)
	}
	for _, billing := range billings {
		if billing.Status == resources.Subscription {
			if err := r.DBClient.UpdateBillingStatus(
				[]string{billing.OrderID}, resources.Subscription,
			); err != nil {
				return fmt.Errorf("mark billing %s subscription: %w", billing.OrderID, err)
			}
			continue
		}
		orderIDs := []string{billing.OrderID}
		if err := r.AccountV2.AddDeductionBalanceWithCredits(
			&types.UserQueryOpts{Owner: owner}, billing.Amount, orderIDs,
		); err != nil {
			return fmt.Errorf("deduct billing %s with credits: %w", billing.OrderID, err)
		}
		if err := r.DBClient.UpdateBillingStatus(orderIDs, resources.Settled); err != nil {
			return fmt.Errorf("mark billing %s settled: %w", billing.OrderID, err)
		}
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
		return errors.New("batch size must be greater than zero")
	}

	owners := make([]string, 0, len(ownerListMap)) // store all owners
	for owner := range ownerListMap {
		owners = append(owners, owner)
	}

	total := len(owners)
	for i := 0; i < total; i += batchSize {
		end := min(i+batchSize, total)

		batchOwners := owners[i:end] // the owner list of the current batch
		batchOwnerMap := make(map[string][]string, len(batchOwners))
		for _, owner := range batchOwners {
			batchOwnerMap[owner] = ownerListMap[owner] // example retrieve a namespace
		}
		// call processing logic
		if err := reconcileFunc(batchOwnerMap, now); err != nil {
			return fmt.Errorf("failed to reconcile batch from %d to %d: %w", i, end, err)
		}
		r.Info("reconcile batch", "from", i, "to", end)
	}
	return nil
}

func (r *BillingReconciler) getRecentUsedOwnersAt(
	endHourTime time.Time,
) (map[string][]string, error) {
	endHourTime = endHourTime.UTC().Truncate(time.Hour)
	startHourTime := endHourTime.Add(-1 * time.Hour)
	monitorStartedAt := time.Now()
	namespaceList, err := r.DBClient.GetTimeUsedNamespaceList(startHourTime, endHourTime)
	if err != nil {
		return nil, fmt.Errorf("get recent owners failed: %w", err)
	}
	r.Info(
		"get monitored namespaces",
		"namespace count", len(namespaceList),
		"duration", time.Since(monitorStartedAt),
	)
	if len(namespaceList) == 0 {
		r.Info(
			"billing source monitor window is empty",
			"billingTime",
			endHourTime.Format(time.RFC3339),
		)
	}
	lookupStartedAt := time.Now()
	nsToOwnerMap, err := r.getUsersForNamespaces(namespaceList)
	if err != nil {
		return nil, fmt.Errorf("get users for monitored namespaces failed: %w", err)
	}
	r.Info(
		"get owner and namespace",
		"matched user count",
		len(nsToOwnerMap),
		"namespace count",
		len(namespaceList),
		"duration",
		time.Since(lookupStartedAt),
	)
	usedOwnerList := make(map[string][]string)
	for _, ns := range namespaceList {
		if owner, ok := nsToOwnerMap[ns]; ok {
			if _, ok := usedOwnerList[owner]; !ok {
				userUID, err := r.AccountV2.GetUserUID(
					&types.UserQueryOpts{Owner: owner, IgnoreEmpty: true},
				)
				if err != nil {
					return nil, fmt.Errorf("get user uid failed: %w", err)
				}
				if userUID == uuid.Nil {
					r.Error(errors.New("user uid is nil"), "get user uid failed", "owner", owner)
					continue
				}
				_, inDebt := DebtUserMap.Get(userUID.String())
				if inDebt {
					// r.Logger.Info("user is in debt", "user uid", userUID.String())
					continue
				}
				usedOwnerList[owner] = []string{}
			}
			usedOwnerList[owner] = append(usedOwnerList[owner], ns)
		}
	}
	r.Info("get monitored users", "count", len(usedOwnerList))
	return usedOwnerList, nil
}

func (r *BillingReconciler) getUsersForNamespaces(namespaces []string) (map[string]string, error) {
	nsToOwnerMap := make(map[string]string, len(namespaces))
	for _, namespace := range namespaces {
		if !strings.HasPrefix(namespace, UserNamespacePrefix) {
			continue
		}
		user := &userv1.User{}
		if err := r.Get(
			context.Background(),
			client.ObjectKey{Name: strings.TrimPrefix(namespace, UserNamespacePrefix)},
			user,
		); err != nil {
			if apierrors.IsNotFound(err) {
				continue
			}
			return nil, fmt.Errorf("get user for namespace %s: %w", namespace, err)
		}
		if owner := user.Annotations[userv1.UserLabelOwnerKey]; owner != "" {
			nsToOwnerMap[namespace] = owner
		}
	}
	return nsToOwnerMap, nil
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
	if os.Getenv("CREDITS_ENABLED") == trueStatus ||
		os.Getenv("SUBSCRIPTION_ENABLED") == trueStatus {
		r.reconcileBillingFunc = r.reconcileBillingWithCredits
	}
	return nil
}
