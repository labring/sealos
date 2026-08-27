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
	"database/sql"
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
	"gorm.io/gorm"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type BillingTaskRunner struct {
	*BillingReconciler
}

func (r *BillingTaskRunner) NeedLeaderElection() bool { return true }

const (
	billingMonitorDelay              = 5 * time.Minute
	billingRetryDelay                = time.Minute
	defaultBillingMaxCatchupDuration = 24 * time.Hour
	billingMaxCatchupDurationEnv     = "BILLING_MAX_CATCHUP_DURATION"
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

func runBillingReads(tasks ...func() error) error {
	errs := make([]error, len(tasks))
	var wg sync.WaitGroup
	for i, task := range tasks {
		wg.Add(1)
		go func(index int, read func() error) {
			defer wg.Done()
			errs[index] = read()
		}(i, task)
	}
	wg.Wait()
	return errors.Join(errs...)
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
	reconcileBillingFunc   func(owner string, billings []*resources.Billing, endHourTime time.Time) error
	executeBillingHourFunc func(time.Time) error
	concurrentLimit        int64
	DebtUserMap            *maps.ConcurrentMap
	debtOwnerMap           *maps.ConcurrentNullValueMap
}

func (r *BillingReconciler) ExecuteBillingTask() error {
	return r.ExecuteBillingTasksUntil(latestReadyBillingHour(time.Now()))
}

func (r *BillingReconciler) ExecuteBillingTasksUntil(target time.Time) (err error) {
	target = target.UTC().Truncate(time.Hour)
	setBillingTargetMetrics(target)
	defer func() {
		setBillingProcessingMetrics(time.Time{}, false)
		if err != nil {
			billingReconcileFailures.Inc()
		}
	}()
	checkpoint, exists, err := r.DBClient.GetBillingCheckpoint()
	if err != nil {
		return fmt.Errorf("get billing checkpoint: %w", err)
	}
	maxCatchup := env.GetDurationEnvWithDefault(
		billingMaxCatchupDurationEnv,
		defaultBillingMaxCatchupDuration,
	)
	if err := validateBillingMaxCatchupDuration(maxCatchup); err != nil {
		return err
	}
	persistedCheckpoint := checkpoint.UTC().Truncate(time.Hour)
	if !exists {
		checkpoint = target.Add(-time.Hour)
		persistedCheckpoint = checkpoint
	} else {
		checkpoint, err = limitBillingCheckpoint(persistedCheckpoint, target, maxCatchup)
		if err != nil {
			return err
		}
		if checkpoint.After(persistedCheckpoint) {
			r.Info(
				"billing catch-up window truncated",
				"persistedCheckpoint", persistedCheckpoint.Format(time.RFC3339),
				"replayFrom", checkpoint.Format(time.RFC3339),
				"skippedHours", int64(checkpoint.Sub(persistedCheckpoint)/time.Hour),
			)
		}
	}
	setBillingCheckpointMetrics(persistedCheckpoint, target)
	setBillingPendingCheckpointMetrics(checkpoint, target)
	for _, billingTime := range billingHoursAfter(checkpoint, target) {
		setBillingProcessingMetrics(billingTime, true)
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
		checkpoint = billingTime
		setBillingCheckpointMetrics(checkpoint, target)
		billingLastSuccessTimestamp.Set(float64(time.Now().UTC().Unix()))
	}
	return nil
}

func validateBillingMaxCatchupDuration(maxCatchup time.Duration) error {
	if maxCatchup < time.Hour || maxCatchup%time.Hour != 0 {
		return fmt.Errorf(
			"%s must be a positive whole number of hours: %s",
			billingMaxCatchupDurationEnv,
			maxCatchup,
		)
	}
	return nil
}

func limitBillingCheckpoint(
	checkpoint, target time.Time,
	maxCatchup time.Duration,
) (time.Time, error) {
	if err := validateBillingMaxCatchupDuration(maxCatchup); err != nil {
		return time.Time{}, err
	}
	checkpoint = checkpoint.UTC().Truncate(time.Hour)
	target = target.UTC().Truncate(time.Hour)
	earliest := target.Add(-maxCatchup)
	if checkpoint.Before(earliest) {
		return earliest, nil
	}
	return checkpoint, nil
}

func (r *BillingReconciler) ExecuteBillingTaskAt(endHourTime time.Time) error {
	endHourTime = endHourTime.UTC().Truncate(time.Hour)
	taskStartedAt := time.Now()
	r.Info("start billing reconcile", "billingTime", endHourTime.Format(time.RFC3339))
	DebtUserMap = maps.NewConcurrentNullValueMap()
	SubscriptionWorkspaceMap = maps.NewConcurrentNullValueMap()
	r.debtOwnerMap = maps.NewConcurrentNullValueMap()
	var ownerListMap map[string][]string
	var ownerUserUIDs map[string]uuid.UUID
	inputStartedAt := time.Now()
	if err := runBillingReads(
		func() error {
			return r.loadDebtUsersAt(endHourTime)
		},
		func() error {
			var err error
			ownerListMap, ownerUserUIDs, err = r.getRecentUsedOwnersAt(endHourTime)
			if err != nil {
				return fmt.Errorf("get recently used owners: %w", err)
			}
			return nil
		},
	); err != nil {
		return fmt.Errorf("load billing inputs: %w", err)
	}
	r.Info("load billing inputs", "duration", time.Since(inputStartedAt))
	r.removeDebtOwners(ownerListMap, ownerUserUIDs)
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
	if err := r.reconcileOwnerListBatch(
		ownerListMap,
		env.GetIntEnvWithDefault("BILLING_RECONCILE_BATCH_COUNT", 200),
		endHourTime,
		r.reconcileOwnerList,
	); err != nil {
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
	startedAt := time.Now()
	db := r.AccountV2.GetGlobalDB()
	var debts []types.Debt
	// Probe the first transition per debt row so catch-up never materializes
	// every status record after the billing boundary.
	if err := db.Raw(`
		SELECT
			d.user_uid,
			COALESCE(first_record.last_status, d.account_debt_status) AS account_debt_status
		FROM "Debt" AS d
		LEFT JOIN LATERAL (
			SELECT r.last_status
			FROM "DebtStatusRecord" AS r
			WHERE r.user_uid = d.user_uid AND r.create_at >= ?
			ORDER BY r.create_at ASC, r.id ASC
			LIMIT 1
		) AS first_record ON TRUE
		WHERE d.created_at < ?`, endHourTime, endHourTime).
		Scan(&debts).Error; err != nil {
		return fmt.Errorf("query consistent billing-period debt state: %w", err)
	}

	var users []string
	for i := range debts {
		if types.ContainDebtStatus(types.DebtStates, debts[i].AccountDebtStatus) {
			users = append(users, debts[i].UserUID.String())
		}
	}
	DebtUserMap.Set(users...)
	r.Info(
		"load billing-period debt users",
		"count", len(users),
		"duration", time.Since(startedAt),
	)
	return nil
}

func (r *BillingReconciler) loadSubscriptionWorkspacesAt(
	endHourTime time.Time,
	ownerListMap map[string][]string,
) error {
	startedAt := time.Now()
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
	var periodTransactions []types.WorkspaceSubscriptionTransaction
	var terminalTransactions []types.WorkspaceSubscriptionTransaction
	// The subscription snapshot and completed transactions describe one entitlement state.
	if err := db.Transaction(
		func(tx *gorm.DB) error {
			if err := tx.Model(&types.WorkspaceSubscription{}).
				Where(
					"region_domain = ? AND workspace IN ? AND create_at <= ?",
					regionDomain,
					workspaces,
					effectiveTime,
				).
				Find(&subscriptions).Error; err != nil {
				return fmt.Errorf("query billing-period workspace subscriptions: %w", err)
			}
			if err := tx.Model(&types.WorkspaceSubscriptionTransaction{}).
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
				return fmt.Errorf(
					"query billing-period workspace subscription transactions: %w",
					err,
				)
			}
			if err := tx.Model(&types.WorkspaceSubscriptionTransaction{}).
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
				return fmt.Errorf(
					"query billing-period terminal subscription transactions: %w",
					err,
				)
			}
			return nil
		},
		&sql.TxOptions{Isolation: sql.LevelSerializable, ReadOnly: true},
	); err != nil {
		return fmt.Errorf("query consistent billing-period subscriptions: %w", err)
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
	r.Info(
		"load billing-period subscriptions",
		"count", len(workspaces),
		"duration", time.Since(startedAt),
	)
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

func (r *BillingReconciler) reconcileOwnerList(
	ownerListMap map[string][]string,
	now time.Time,
) error {
	if r.concurrentLimit <= 0 {
		return fmt.Errorf(
			"billing concurrent limit must be greater than zero: %d", r.concurrentLimit,
		)
	}
	endHourTime := now.UTC().Truncate(time.Hour)
	startHourTime := endHourTime.Add(-1 * time.Hour)
	ownerList := make([]string, 0, len(ownerListMap))
	for owner := range ownerListMap {
		ownerList = append(ownerList, owner)
	}
	generationOwners := make(map[string][]string, len(ownerListMap))
	for owner, namespaces := range ownerListMap {
		if r.ownerInDebt(owner) {
			continue
		}
		generationOwners[owner] = namespaces
	}

	var existingBillings map[string][]*resources.Billing
	var ownerBillings map[string][]*resources.Billing
	if err := runBillingReads(
		func() error {
			startedAt := time.Now()
			var err error
			existingBillings, err = r.DBClient.GetOwnerBillingsAt(ownerList, endHourTime)
			if err != nil {
				return fmt.Errorf("get existing owner billings: %w", err)
			}
			r.Info(
				"get existing owner billings",
				"owner count", len(existingBillings),
				"duration", time.Since(startedAt),
			)
			return nil
		},
		func() error {
			startedAt := time.Now()
			var err error
			ownerBillings, err = r.DBClient.GenerateBillingData(
				startHourTime,
				endHourTime,
				r.Properties,
				generationOwners,
			)
			if err != nil {
				return fmt.Errorf("generate billing data: %w", err)
			}
			r.Info(
				"generate billing data",
				"count", len(ownerBillings),
				"duration", time.Since(startedAt),
			)
			return nil
		},
	); err != nil {
		return err
	}
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
			reconcileErr := r.reconcileBillingFunc(owner, billings, endHourTime)
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
		billingFailedOwners.Set(float64(len(failedList)))
		return fmt.Errorf("failed to reconcile owners: %s", strings.Join(failedList, ","))
	}
	billingFailedOwners.Set(0)
	return nil
}

func billingBusinessKey(billing *resources.Billing) string {
	return fmt.Sprintf("%s\x00%d\x00%s", billing.Namespace, billing.AppType, billing.AppName)
}

func classifyGeneratedBillings(ownerBillings map[string][]*resources.Billing) {
	for _, billings := range ownerBillings {
		for _, billing := range billings {
			billing.Status = resources.Settled
			if _, ok := SubscriptionWorkspaceMap.Get(billing.Namespace); ok {
				billing.Status = resources.Subscription
			}
		}
	}
}

func (r *BillingReconciler) isSubscriptionBilling(billing *resources.Billing) bool {
	if SubscriptionWorkspaceMap == nil {
		return false
	}
	_, ok := SubscriptionWorkspaceMap.Get(billing.Namespace)
	return ok
}

func pendingOwnerBillings(
	generated, existing map[string][]*resources.Billing,
) map[string][]*resources.Billing {
	pending := make(map[string][]*resources.Billing)
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

func (r *BillingReconciler) reconcileBilling(
	owner string,
	billings []*resources.Billing,
	_ time.Time,
) error {
	amount := int64(0)
	orderIDs := make([]string, 0, len(billings))
	for _, billing := range billings {
		if billing.Status == resources.Subscription || r.isSubscriptionBilling(billing) {
			billing.Status = resources.Subscription
			continue
		}
		amount += billing.Amount
		orderIDs = append(orderIDs, billing.OrderID)
	}
	if err := r.DBClient.SaveBillings(billings...); err != nil {
		return fmt.Errorf("save billings failed: %w", err)
	}
	if amount == 0 {
		return nil
	}
	if err := r.AccountV2.AddDeductionBalance(
		&types.UserQueryOpts{Owner: owner}, amount,
	); err != nil {
		if updateErr := r.DBClient.UpdateBillingStatus(
			orderIDs, resources.Unsettled,
		); updateErr != nil {
			r.Error(updateErr, "update billing unsettled status failed", "orderIDs", orderIDs)
		}
		return fmt.Errorf("deduct owner %s balance: %w", owner, err)
	}
	return nil
}

func (r *BillingReconciler) reconcileBillingWithCredits(
	owner string,
	billings []*resources.Billing,
	endHourTime time.Time,
) error {
	amount := int64(0)
	orderIDs := make([]string, 0, len(billings))
	for _, billing := range billings {
		if billing.Status == resources.Subscription || r.isSubscriptionBilling(billing) {
			billing.Status = resources.Subscription
			continue
		}
		amount += billing.Amount
		orderIDs = append(orderIDs, billing.OrderID)
	}
	if err := r.DBClient.SaveBillings(billings...); err != nil {
		return fmt.Errorf("save billings failed: %w", err)
	}
	if amount == 0 {
		return nil
	}
	if err := r.AccountV2.AddDeductionBalanceWithCreditsAt(
		&types.UserQueryOpts{Owner: owner}, amount, orderIDs, endHourTime,
	); err != nil {
		if updateErr := r.DBClient.UpdateBillingStatus(
			orderIDs, resources.Unsettled,
		); updateErr != nil {
			r.Error(updateErr, "update billing unsettled status failed", "orderIDs", orderIDs)
		}
		return fmt.Errorf("deduct owner %s with credits: %w", owner, err)
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
) (map[string][]string, map[string]uuid.UUID, error) {
	endHourTime = endHourTime.UTC().Truncate(time.Hour)
	startHourTime := endHourTime.Add(-1 * time.Hour)
	monitorStartedAt := time.Now()
	namespaceList, err := r.DBClient.GetTimeUsedNamespaceList(startHourTime, endHourTime)
	if err != nil {
		return nil, nil, fmt.Errorf("get recent owners failed: %w", err)
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
		return nil, nil, fmt.Errorf("get users for monitored namespaces failed: %w", err)
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
	ownerUserUIDs := make(map[string]uuid.UUID)
	for _, ns := range namespaceList {
		if owner, ok := nsToOwnerMap[ns]; ok {
			if _, ok := usedOwnerList[owner]; !ok {
				userUID, err := r.AccountV2.GetUserUID(
					&types.UserQueryOpts{Owner: owner, IgnoreEmpty: true},
				)
				if err != nil {
					return nil, nil, fmt.Errorf("get user uid failed: %w", err)
				}
				if userUID == uuid.Nil {
					r.Error(errors.New("user uid is nil"), "get user uid failed", "owner", owner)
					continue
				}
				ownerUserUIDs[owner] = userUID
				usedOwnerList[owner] = []string{}
			}
			usedOwnerList[owner] = append(usedOwnerList[owner], ns)
		}
	}
	r.Info("get monitored users", "count", len(usedOwnerList))
	return usedOwnerList, ownerUserUIDs, nil
}

func (r *BillingReconciler) removeDebtOwners(
	ownerListMap map[string][]string,
	ownerUserUIDs map[string]uuid.UUID,
) {
	for owner, userUID := range ownerUserUIDs {
		if _, inDebt := DebtUserMap.Get(userUID.String()); inDebt {
			delete(ownerListMap, owner)
			r.debtOwnerMap.Set(owner)
		}
	}
}

func (r *BillingReconciler) ownerInDebt(owner string) bool {
	if r.debtOwnerMap == nil {
		return false
	}
	_, inDebt := r.debtOwnerMap.Get(owner)
	return inDebt
}

func (r *BillingReconciler) getUsersForNamespaces(namespaces []string) (map[string]string, error) {
	nsToOwnerMap := make(map[string]string, len(namespaces))
	for _, namespace := range namespaces {
		if !strings.HasPrefix(namespace, UserNamespacePrefix) {
			continue
		}
		user := &metav1.PartialObjectMetadata{}
		user.SetGroupVersionKind(userv1.GroupVersion.WithKind("User"))
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
