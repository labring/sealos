package controllers

import (
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/go-logr/logr"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils/maps"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/prometheus/client_golang/prometheus/testutil"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

type billingTestAccount struct {
	database.Account
	mu               sync.Mutex
	checkpoint       time.Time
	hasCheckpoint    bool
	checkpointWrites []time.Time
	monitorErr       error
	existing         map[string][]*resources.Billing
	unsettled        map[string][]*resources.Billing
	generated        map[string][]*resources.Billing
	generateInput    map[string][]string
	saveErr          error
	saved            []*resources.Billing
	statuses         map[string]resources.BillingStatus
}

func (f *billingTestAccount) GetBillingCheckpoint() (time.Time, bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.checkpoint, f.hasCheckpoint, nil
}

func (f *billingTestAccount) SaveBillingCheckpoint(value time.Time) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.checkpoint, f.hasCheckpoint = value, true
	f.checkpointWrites = append(f.checkpointWrites, value)
	return nil
}

func (f *billingTestAccount) GetTimeUsedNamespaceList(time.Time, time.Time) ([]string, error) {
	return nil, f.monitorErr
}

func (f *billingTestAccount) GetOwnerBillingsAt(
	[]string,
	time.Time,
) (map[string][]*resources.Billing, error) {
	return f.existing, nil
}

func (f *billingTestAccount) GetUnsettledBillingsAt(
	time.Time,
) (map[string][]*resources.Billing, error) {
	return f.unsettled, nil
}

func (f *billingTestAccount) GenerateBillingData(
	_ time.Time,
	_ time.Time,
	_ *resources.PropertyTypeLS,
	ownerListMap map[string][]string,
) (map[string][]*resources.Billing, error) {
	f.mu.Lock()
	f.generateInput = make(map[string][]string, len(ownerListMap))
	for owner, namespaces := range ownerListMap {
		f.generateInput[owner] = append([]string(nil), namespaces...)
	}
	f.mu.Unlock()
	return f.generated, nil
}

func (f *billingTestAccount) SaveBillings(billings ...*resources.Billing) error {
	if f.saveErr != nil {
		return f.saveErr
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.saved = append(f.saved, billings...)
	return nil
}

func (f *billingTestAccount) UpdateBillingStatus(
	orderIDs []string,
	status resources.BillingStatus,
) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.statuses == nil {
		f.statuses = make(map[string]resources.BillingStatus)
	}
	for _, orderID := range orderIDs {
		f.statuses[orderID] = status
	}
	return nil
}

type billingTestAccountV2 struct {
	database.AccountV2
	mu         sync.Mutex
	err        error
	deductions int
	amounts    []int64
}

func (f *billingTestAccountV2) AddDeductionBalance(
	_ *types.UserQueryOpts, amount int64,
) error {
	if f.err != nil {
		return f.err
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.deductions++
	f.amounts = append(f.amounts, amount)
	return nil
}

func (f *billingTestAccountV2) AddDeductionBalanceWithCreditsAt(
	_ *types.UserQueryOpts, amount int64, _ []string, _ time.Time,
) error {
	if f.err != nil {
		return f.err
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	f.deductions++
	f.amounts = append(f.amounts, amount)
	return nil
}

func initBillingTestGlobals() {
	DebtUserMap = maps.NewConcurrentNullValueMap()
	SubscriptionWorkspaceMap = maps.NewConcurrentNullValueMap()
}

func TestRunBillingReadsRunsIndependentTasksConcurrently(t *testing.T) {
	started := make(chan struct{}, 2)
	release := make(chan struct{})
	result := make(chan error, 1)
	wantErr := errors.New("read failed")

	read := func(err error) func() error {
		return func() error {
			started <- struct{}{}
			<-release
			return err
		}
	}
	go func() {
		result <- runBillingReads(read(nil), read(wantErr))
	}()

	for range 2 {
		select {
		case <-started:
		case <-time.After(time.Second):
			close(release)
			t.Fatal("independent read did not start concurrently")
		}
	}
	close(release)
	if err := <-result; !errors.Is(err, wantErr) {
		t.Fatalf("error = %v, want %v", err, wantErr)
	}
}

func TestBillingMetricsTrackCheckpointLag(t *testing.T) {
	checkpoint := time.Date(2026, time.July, 7, 9, 0, 0, 0, time.UTC)
	target := checkpoint.Add(3 * time.Hour)
	setBillingTargetMetrics(target)
	setBillingCheckpointMetrics(checkpoint, target)

	wantLag := 3 * float64(time.Hour/time.Second)
	if got := testutil.ToFloat64(billingCheckpointLagSeconds); got != wantLag {
		t.Fatalf("checkpoint lag seconds = %v, want %v", got, wantLag)
	}
	if got := testutil.ToFloat64(billingPendingCheckpoints); got != 3 {
		t.Fatalf("pending checkpoints = %v, want 3", got)
	}
	if got := testutil.ToFloat64(billingTargetTimestamp); got != float64(target.Unix()) {
		t.Fatalf("target timestamp = %v, want %v", got, target.Unix())
	}
	setBillingProcessingMetrics(target, true)
	if got := testutil.ToFloat64(billingProcessing); got != 1 {
		t.Fatalf("processing = %v, want 1", got)
	}
	if got := testutil.ToFloat64(billingProcessingStartedTimestamp); got <= 0 {
		t.Fatalf("processing started timestamp = %v, want positive timestamp", got)
	}
	setBillingProcessingMetrics(time.Time{}, false)
	if got := testutil.ToFloat64(billingProcessing); got != 0 {
		t.Fatalf("processing = %v, want 0", got)
	}
	if got := testutil.ToFloat64(billingProcessingStartedTimestamp); got != 0 {
		t.Fatalf("processing started timestamp = %v, want 0", got)
	}
}

func TestBillingHourScheduling(t *testing.T) {
	t.Run("normal hourly execution", func(t *testing.T) {
		checkpoint := time.Date(2026, time.July, 7, 9, 0, 0, 0, time.UTC)
		target := checkpoint.Add(time.Hour)
		hours := billingHoursAfter(checkpoint, target)
		if len(hours) != 1 || !hours[0].Equal(target) {
			t.Fatalf("hours = %v", hours)
		}
	})

	t.Run("start after half hour", func(t *testing.T) {
		now := time.Date(2026, time.July, 7, 10, 37, 0, 0, time.UTC)
		want := time.Date(2026, time.July, 7, 10, 0, 0, 0, time.UTC)
		if got := latestReadyBillingHour(now); !got.Equal(want) {
			t.Fatalf("ready hour = %v, want %v", got, want)
		}
	})

	t.Run("resume after several hours", func(t *testing.T) {
		start := time.Date(2026, time.July, 7, 7, 0, 0, 0, time.UTC)
		hours := billingHoursAfter(start, start.Add(4*time.Hour))
		if len(hours) != 4 {
			t.Fatalf("hours = %v", hours)
		}
	})

	t.Run("task crosses next hour", func(t *testing.T) {
		started := time.Date(2026, time.July, 7, 10, 6, 0, 0, time.UTC)
		finished := started.Add(61 * time.Minute)
		if !latestReadyBillingHour(finished).After(latestReadyBillingHour(started)) {
			t.Fatalf("finished target did not advance")
		}
	})
}

func TestOwnerInDebtUsesOwnerMapping(t *testing.T) {
	initBillingTestGlobals()
	DebtUserMap.Set("owner-uid")
	reconciler := &BillingReconciler{
		debtOwnerMap: maps.NewConcurrentNullValueMap(),
	}
	if reconciler.ownerInDebt("owner-uid") {
		t.Fatal("user UID was treated as an owner")
	}
	reconciler.debtOwnerMap.Set("owner")
	if !reconciler.ownerInDebt("owner") {
		t.Fatal("debt owner was not detected")
	}
}

func TestExecuteBillingTasksUntilPersistsEachSuccessfulHour(t *testing.T) {
	start := time.Date(2026, time.July, 7, 7, 0, 0, 0, time.UTC)
	db := &billingTestAccount{checkpoint: start, hasCheckpoint: true}
	var executed []time.Time
	reconciler := &BillingReconciler{
		DBClient: db,
		executeBillingHourFunc: func(hour time.Time) error {
			executed = append(executed, hour)
			return nil
		},
	}
	if err := reconciler.ExecuteBillingTasksUntil(start.Add(3 * time.Hour)); err != nil {
		t.Fatal(err)
	}
	if len(executed) != 3 || len(db.checkpointWrites) != 3 {
		t.Fatalf("executed=%v checkpoints=%v", executed, db.checkpointWrites)
	}
}

func TestExecuteBillingTasksUntilFirstStartProcessesLatestHour(t *testing.T) {
	t.Setenv(billingMaxCatchupDurationEnv, "72h")
	target := time.Date(2026, time.July, 7, 10, 0, 0, 0, time.UTC)
	db := &billingTestAccount{}
	var executed []time.Time
	reconciler := &BillingReconciler{
		DBClient: db,
		executeBillingHourFunc: func(hour time.Time) error {
			executed = append(executed, hour)
			return nil
		},
	}
	if err := reconciler.ExecuteBillingTasksUntil(target); err != nil {
		t.Fatal(err)
	}
	if len(executed) != 1 || !executed[0].Equal(target) {
		t.Fatalf("executed = %v", executed)
	}
}

func TestExecuteBillingTasksUntilLimitsHistoricalCatchup(t *testing.T) {
	t.Setenv(billingMaxCatchupDurationEnv, "48h")
	target := time.Date(2026, time.July, 7, 10, 0, 0, 0, time.UTC)
	db := &billingTestAccount{checkpoint: target.Add(-72 * time.Hour), hasCheckpoint: true}
	var executed []time.Time
	var pendingAtStart, checkpointAtStart float64
	reconciler := &BillingReconciler{
		DBClient: db,
		executeBillingHourFunc: func(hour time.Time) error {
			if len(executed) == 0 {
				pendingAtStart = testutil.ToFloat64(billingPendingCheckpoints)
				checkpointAtStart = testutil.ToFloat64(billingCheckpointTimestamp)
			}
			executed = append(executed, hour)
			return nil
		},
	}
	if err := reconciler.ExecuteBillingTasksUntil(target); err != nil {
		t.Fatal(err)
	}
	if len(executed) != 48 {
		t.Fatalf("executed %d hours, want 48", len(executed))
	}
	if pendingAtStart != 48 {
		t.Fatalf("pending checkpoints at start = %v, want 48", pendingAtStart)
	}
	if want := float64(target.Add(-72 * time.Hour).Unix()); checkpointAtStart != want {
		t.Fatalf("checkpoint metric at start = %v, want %v", checkpointAtStart, want)
	}
	if !executed[0].Equal(target.Add(-47 * time.Hour)) {
		t.Fatalf("first executed hour = %v, want %v", executed[0], target.Add(-47*time.Hour))
	}
	if !db.checkpoint.Equal(target) {
		t.Fatalf("checkpoint = %v, want %v", db.checkpoint, target)
	}
}

func TestLimitBillingCheckpointValidatesDuration(t *testing.T) {
	checkpoint := time.Date(2026, time.July, 4, 10, 0, 0, 0, time.UTC)
	target := time.Date(2026, time.July, 7, 10, 0, 0, 0, time.UTC)
	limited, err := limitBillingCheckpoint(checkpoint, target, 48*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	if want := target.Add(-48 * time.Hour); !limited.Equal(want) {
		t.Fatalf("limited checkpoint = %v, want %v", limited, want)
	}
	if _, err := limitBillingCheckpoint(checkpoint, target, 90*time.Minute); err == nil {
		t.Fatal("expected non-whole-hour duration error")
	}
}

func TestExecuteBillingTasksUntilStopsAtFailedHour(t *testing.T) {
	start := time.Date(2026, time.July, 7, 7, 0, 0, 0, time.UTC)
	db := &billingTestAccount{checkpoint: start, hasCheckpoint: true}
	reconciler := &BillingReconciler{
		DBClient: db,
		executeBillingHourFunc: func(hour time.Time) error {
			if hour.Equal(start.Add(2 * time.Hour)) {
				return errors.New("monitor unavailable")
			}
			return nil
		},
	}
	if err := reconciler.ExecuteBillingTasksUntil(start.Add(3 * time.Hour)); err == nil {
		t.Fatal("expected failed hour error")
	}
	if !db.checkpoint.Equal(start.Add(time.Hour)) {
		t.Fatalf("checkpoint = %v", db.checkpoint)
	}
}

func TestExecuteBillingTasksUntilAdvancesCheckpointWhenMonitorDataIsEmpty(t *testing.T) {
	start := time.Date(2026, time.July, 7, 7, 0, 0, 0, time.UTC)
	db := &billingTestAccount{checkpoint: start, hasCheckpoint: true}
	reconciler := &BillingReconciler{DBClient: db, Logger: logr.Discard()}
	reconciler.executeBillingHourFunc = func(hour time.Time) error {
		owners, _, err := reconciler.getRecentUsedOwnersAt(hour)
		if len(owners) != 0 {
			t.Fatalf("owners=%v", owners)
		}
		return err
	}
	target := start.Add(time.Hour)
	if err := reconciler.ExecuteBillingTasksUntil(target); err != nil {
		t.Fatal(err)
	}
	if !db.checkpoint.Equal(target) || len(db.checkpointWrites) != 1 {
		t.Fatalf("checkpoint=%v writes=%v", db.checkpoint, db.checkpointWrites)
	}
}

func TestGetRecentUsedOwnersReturnsMonitorError(t *testing.T) {
	db := &billingTestAccount{monitorErr: errors.New("query failed")}
	reconciler := &BillingReconciler{DBClient: db}
	_, _, err := reconciler.getRecentUsedOwnersAt(time.Now())
	if err == nil {
		t.Fatal("expected monitor query error")
	}
}

func TestActiveWorkspaceSubscriptionsAtBillingHour(t *testing.T) {
	hour := time.Date(2026, time.July, 7, 10, 0, 0, 0, time.UTC)
	activeStart := hour.Add(-24 * time.Hour)
	activeEnd := hour.Add(time.Hour)
	expiredEnd := hour.Add(-time.Minute)
	subscriptions := []types.WorkspaceSubscription{
		{
			Workspace: "active", CreateAt: activeStart,
			CurrentPeriodStartAt: activeStart, CurrentPeriodEndAt: activeEnd,
		},
		{
			Workspace: "purchased-later", CreateAt: hour.Add(time.Hour),
			CurrentPeriodStartAt: hour.Add(time.Hour), CurrentPeriodEndAt: hour.Add(48 * time.Hour),
		},
		{
			Workspace: "expired", CreateAt: activeStart,
			CurrentPeriodStartAt: activeStart, CurrentPeriodEndAt: expiredEnd,
		},
		{
			Workspace: "renewed-later", CreateAt: activeStart, UpdateAt: hour.Add(time.Hour),
			CurrentPeriodStartAt: activeStart, CurrentPeriodEndAt: hour.Add(48 * time.Hour),
		},
	}
	transactions := []types.WorkspaceSubscriptionTransaction{
		{
			ID:        uuid.New(),
			Workspace: "previous-period",
			Operator:  types.SubscriptionTransactionTypeCreated,
			Status:    types.SubscriptionTransactionStatusCompleted,
			PayStatus: types.SubscriptionPayStatusPaid,
			StartAt:   hour.Add(-12 * time.Hour),
			UpdatedAt: hour.Add(-11 * time.Hour),
			Period:    types.DayPeriod(1),
		},
		{
			ID:        uuid.New(),
			Workspace: "delayed-activation",
			Operator:  types.SubscriptionTransactionTypeUpgraded,
			Status:    types.SubscriptionTransactionStatusCompleted,
			PayStatus: types.SubscriptionPayStatusPaid,
			StartAt:   hour.Add(-25 * time.Hour),
			UpdatedAt: hour.Add(-23 * time.Hour),
			Period:    types.DayPeriod(1),
		},
		{
			ID:        uuid.New(),
			Workspace: "completed-later",
			Operator:  types.SubscriptionTransactionTypeCreated,
			Status:    types.SubscriptionTransactionStatusCompleted,
			PayStatus: types.SubscriptionPayStatusPaid,
			StartAt:   hour.Add(-12 * time.Hour),
			UpdatedAt: hour.Add(time.Hour),
			Period:    types.DayPeriod(1),
		},
		{
			ID:        uuid.New(),
			Workspace: "canceled",
			Operator:  types.SubscriptionTransactionTypeCreated,
			Status:    types.SubscriptionTransactionStatusCompleted,
			PayStatus: types.SubscriptionPayStatusPaid,
			StartAt:   hour.Add(-12 * time.Hour),
			UpdatedAt: hour.Add(-11 * time.Hour),
			Period:    types.DayPeriod(1),
		},
		{
			ID:        uuid.New(),
			Workspace: "canceled",
			Operator:  types.SubscriptionTransactionTypeCanceled,
			Status:    types.SubscriptionTransactionStatusCompleted,
			PayStatus: types.SubscriptionPayStatusCanceled,
			StartAt:   hour.Add(-time.Hour),
			UpdatedAt: hour.Add(-time.Hour),
		},
	}
	workspaces, err := activeWorkspaceSubscriptionsAt(hour, subscriptions, transactions)
	if err != nil {
		t.Fatal(err)
	}
	got := make(map[string]struct{}, len(workspaces))
	for _, workspace := range workspaces {
		got[workspace] = struct{}{}
	}
	if _, exists := got["active"]; !exists {
		t.Fatal("active current period is missing")
	}
	if _, exists := got["previous-period"]; !exists {
		t.Fatal("active historical transaction period is missing")
	}
	if _, exists := got["delayed-activation"]; !exists {
		t.Fatal("subscription completion time was not used as its period start")
	}
	if _, exists := got["purchased-later"]; exists {
		t.Fatal("future subscription was applied to historical billing")
	}
	if _, exists := got["expired"]; exists {
		t.Fatal("expired subscription was applied to billing")
	}
	if _, exists := got["renewed-later"]; exists {
		t.Fatal("later subscription snapshot was applied to historical billing")
	}
	if _, exists := got["completed-later"]; exists {
		t.Fatal("later transaction completion was applied to historical billing")
	}
	if _, exists := got["canceled"]; exists {
		t.Fatal("canceled subscription was applied to billing")
	}
}

func TestGetUsersForNamespacesUsesTargetedLookups(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := userv1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	userA := &userv1.User{}
	userA.Name = "a"
	userA.Annotations = map[string]string{userv1.UserLabelOwnerKey: "owner-a"}
	userB := &userv1.User{}
	userB.Name = "b"
	userB.Annotations = map[string]string{userv1.UserLabelOwnerKey: "owner-b"}
	reconciler := &BillingReconciler{Client: fake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(userA, userB).
		Build()}

	owners, err := reconciler.getUsersForNamespaces([]string{
		"ns-a", "ns-b", "ns-missing", "workspace-without-user-prefix",
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(owners) != 2 || owners["ns-a"] != "owner-a" || owners["ns-b"] != "owner-b" {
		t.Fatalf("owners = %#v", owners)
	}
}

func TestReconcileOwnerListReturnsPartialOwnerFailure(t *testing.T) {
	initBillingTestGlobals()
	end := time.Date(2026, time.July, 7, 10, 0, 0, 0, time.UTC)
	db := &billingTestAccount{
		existing: map[string][]*resources.Billing{},
		generated: map[string][]*resources.Billing{
			"owner-a": {{OrderID: "a", Owner: "owner-a", Namespace: "ns-a", Time: end, Amount: 1}},
			"owner-b": {{OrderID: "b", Owner: "owner-b", Namespace: "ns-b", Time: end, Amount: 1}},
		},
	}
	reconciler := &BillingReconciler{
		DBClient:        db,
		Logger:          logr.Discard(),
		concurrentLimit: 2,
		reconcileBillingFunc: func(owner string, _ []*resources.Billing, _ time.Time) error {
			db.mu.Lock()
			if db.statuses == nil {
				db.statuses = make(map[string]resources.BillingStatus)
			}
			db.statuses[owner] = resources.Settled
			db.mu.Unlock()
			if owner == "owner-b" {
				return errors.New("save failed")
			}
			return nil
		},
	}
	err := reconciler.reconcileOwnerList(map[string][]string{
		"owner-a": {"ns-a"}, "owner-b": {"ns-b"},
	}, end)
	if err == nil {
		t.Fatal("expected partial owner failure")
	}
	if len(db.statuses) != 2 {
		t.Fatalf("reconciled owner count = %d", len(db.statuses))
	}
}

func TestReconcileOwnerListRejectsNonPositiveConcurrency(t *testing.T) {
	reconciler := &BillingReconciler{concurrentLimit: 0}
	if err := reconciler.reconcileOwnerList(nil, time.Now()); err == nil {
		t.Fatal("expected invalid concurrency error")
	}
}

func TestReconcileBillingSaveFailure(t *testing.T) {
	initBillingTestGlobals()
	db := &billingTestAccount{saveErr: errors.New("insert failed")}
	reconciler := &BillingReconciler{DBClient: db, AccountV2: &billingTestAccountV2{}}
	err := reconciler.reconcileBilling(
		"owner", []*resources.Billing{{OrderID: "id", Amount: 10}}, time.Now(),
	)
	if err == nil {
		t.Fatal("expected save failure")
	}
}

func TestReconcileBillingDeductionFailureMayLeaveSettled(t *testing.T) {
	initBillingTestGlobals()
	db := &billingTestAccount{}
	account := &billingTestAccountV2{err: errors.New("deduction failed")}
	billing := &resources.Billing{OrderID: "id", Amount: 10, Status: resources.Settled}
	reconciler := &BillingReconciler{DBClient: db, AccountV2: account}
	if err := reconciler.reconcileBilling(
		"owner", []*resources.Billing{billing}, time.Now(),
	); err == nil {
		t.Fatal("expected deduction failure")
	}
	if len(db.saved) != 1 {
		t.Fatalf("saved billing count = %d", len(db.saved))
	}
	if db.saved[0].Status != resources.Settled {
		t.Fatalf("saved billing status = %v", db.saved[0].Status)
	}
	if status := db.statuses[billing.OrderID]; status != resources.Unsettled {
		t.Fatalf("failed deduction status = %v", status)
	}
}

func TestReconcileBillingReclassifiesSubscriptionBeforeDeduction(t *testing.T) {
	initBillingTestGlobals()
	SubscriptionWorkspaceMap.Set("ns-subscription")
	db := &billingTestAccount{}
	account := &billingTestAccountV2{}
	billing := &resources.Billing{
		OrderID:   "subscription-order",
		Namespace: "ns-subscription",
		Amount:    10,
		Status:    resources.Unsettled,
	}
	reconciler := &BillingReconciler{DBClient: db, AccountV2: account}
	if err := reconciler.reconcileBilling(
		"owner", []*resources.Billing{billing}, time.Now(),
	); err != nil {
		t.Fatal(err)
	}
	if account.deductions != 0 {
		t.Fatalf("subscription deductions = %d", account.deductions)
	}
	if billing.Status != resources.Subscription {
		t.Fatalf("billing status = %v", billing.Status)
	}
}

func TestClassifyGeneratedBillingsDefaultsToSettled(t *testing.T) {
	initBillingTestGlobals()
	SubscriptionWorkspaceMap.Set("ns-subscription")
	generated := map[string][]*resources.Billing{"owner": {
		{OrderID: "new-subscription", Namespace: "ns-subscription", AppName: "new"},
		{OrderID: "new-usage", Namespace: "ns-usage", AppName: "usage"},
	}}
	existing := &resources.Billing{
		OrderID: "bh_existing", Namespace: "ns-subscription", AppName: "existing",
		Status: resources.Unsettled,
	}

	classifyGeneratedBillings(generated)
	pending := pendingOwnerBillings(generated, map[string][]*resources.Billing{
		"owner": {existing},
	})["owner"]

	statuses := make(map[string]resources.BillingStatus, len(pending))
	for _, billing := range pending {
		statuses[billing.OrderID] = billing.Status
	}
	if statuses["new-subscription"] != resources.Subscription {
		t.Fatalf("new subscription status = %v", statuses["new-subscription"])
	}
	if statuses["new-usage"] != resources.Settled {
		t.Fatalf("new usage status = %v", statuses["new-usage"])
	}
	if _, exists := statuses[existing.OrderID]; exists {
		t.Fatalf("existing billing was unexpectedly requeued: %v", existing.OrderID)
	}
}

func TestReconcileBillingRetryCanDeductAgain(t *testing.T) {
	initBillingTestGlobals()
	db := &billingTestAccount{}
	account := &billingTestAccountV2{}
	billings := []*resources.Billing{
		{OrderID: "stable-a", Amount: 10, Status: resources.Settled},
		{OrderID: "stable-b", Amount: 15, Status: resources.Settled},
	}
	reconciler := &BillingReconciler{DBClient: db, AccountV2: account}
	for range 2 {
		if err := reconciler.reconcileBilling("owner", billings, time.Now()); err != nil {
			t.Fatal(err)
		}
	}
	if account.deductions != 2 {
		t.Fatalf("deductions = %d", account.deductions)
	}
	if len(account.amounts) != 2 || account.amounts[0] != 25 || account.amounts[1] != 25 {
		t.Fatalf("deduction amounts = %#v", account.amounts)
	}
}

func TestPendingOwnerBillingsSkipsExistingBusinessKeys(t *testing.T) {
	generated := map[string][]*resources.Billing{"owner": {
		{OrderID: "new-a", Namespace: "ns", AppType: 1, AppName: "a"},
		{OrderID: "new-b", Namespace: "ns", AppType: 1, AppName: "b"},
		{OrderID: "new-c", Namespace: "ns", AppType: 1, AppName: "c"},
	}}
	existing := map[string][]*resources.Billing{"owner": {
		{OrderID: "legacy-a", Namespace: "ns", AppType: 1, AppName: "a", Status: resources.Settled},
		{
			OrderID:   "bh_existing-b",
			Namespace: "ns",
			AppType:   1,
			AppName:   "b",
			Status:    resources.Unsettled,
		},
		{
			OrderID:   "bh_orphan-d",
			Namespace: "ns",
			AppType:   1,
			AppName:   "d",
			Status:    resources.Unsettled,
		},
	}}
	pending := pendingOwnerBillings(generated, existing)["owner"]
	got := make(map[string]struct{}, len(pending))
	for _, billing := range pending {
		got[billing.OrderID] = struct{}{}
	}
	if len(got) != 1 {
		t.Fatalf("pending = %#v", pending)
	}
	for _, orderID := range []string{"new-c"} {
		if _, exists := got[orderID]; !exists {
			t.Fatalf("pending billing %s is missing: %#v", orderID, pending)
		}
	}
}
