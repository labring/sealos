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
	mu            sync.Mutex
	err           error
	deductionSeen map[string]struct{}
	deductions    int
}

func (f *billingTestAccountV2) AddDeductionBalanceForBilling(
	_ *types.UserQueryOpts, _ int64, orderIDs []string,
) error {
	if f.err != nil {
		return f.err
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.deductionSeen == nil {
		f.deductionSeen = make(map[string]struct{})
	}
	if _, exists := f.deductionSeen[orderIDs[0]]; exists {
		return nil
	}
	f.deductionSeen[orderIDs[0]] = struct{}{}
	f.deductions++
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

func TestDebtStatusAtBillingHour(t *testing.T) {
	userUID := uuid.New()
	hour := time.Date(2026, time.July, 7, 10, 0, 0, 0, time.UTC)
	debt := types.Debt{
		UserUID: userUID, AccountDebtStatus: types.DebtPeriod, UpdatedAt: hour.Add(time.Hour),
	}

	if got := debtStatusAt(debt, types.DebtStatusRecord{}); got != types.DebtPeriod {
		t.Fatalf("status without a later transition = %s", got)
	}

	after := types.DebtStatusRecord{
		UserUID: userUID, LastStatus: types.NormalPeriod, CurrentStatus: types.DebtPeriod,
	}
	if got := debtStatusAt(debt, after); got != types.NormalPeriod {
		t.Fatalf("status from next record = %s", got)
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
		reconcileBillingFunc: func(owner string, _ []*resources.Billing) error {
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

func TestReconcileBillingSaveFailure(t *testing.T) {
	initBillingTestGlobals()
	db := &billingTestAccount{saveErr: errors.New("insert failed")}
	reconciler := &BillingReconciler{DBClient: db, AccountV2: &billingTestAccountV2{}}
	err := reconciler.reconcileBilling("owner", []*resources.Billing{{OrderID: "id", Amount: 10}})
	if err == nil {
		t.Fatal("expected save failure")
	}
}

func TestReconcileOwnerListRecoversUnsettledWithoutRegeneratedBilling(t *testing.T) {
	initBillingTestGlobals()
	end := time.Date(2026, time.July, 7, 10, 0, 0, 0, time.UTC)
	existing := &resources.Billing{
		OrderID:   "bh_recover",
		Owner:     "owner",
		Namespace: "ns-owner",
		Time:      end,
		Amount:    10,
		Status:    resources.Unsettled,
	}
	db := &billingTestAccount{
		existing:  map[string][]*resources.Billing{"owner": {existing}},
		generated: map[string][]*resources.Billing{},
	}
	var reconciled []*resources.Billing
	reconciler := &BillingReconciler{
		DBClient:        db,
		Logger:          logr.Discard(),
		concurrentLimit: 1,
		reconcileBillingFunc: func(_ string, billings []*resources.Billing) error {
			reconciled = append(reconciled, billings...)
			return nil
		},
	}
	if err := reconciler.reconcileOwnerList(
		map[string][]string{"owner": {"ns-owner"}},
		end,
	); err != nil {
		t.Fatal(err)
	}
	if len(reconciled) != 1 || reconciled[0].OrderID != existing.OrderID {
		t.Fatalf("reconciled = %#v", reconciled)
	}
}

func TestReconcileBillingDeductionFailureLeavesUnsettled(t *testing.T) {
	initBillingTestGlobals()
	db := &billingTestAccount{}
	account := &billingTestAccountV2{err: errors.New("deduction failed")}
	billing := &resources.Billing{OrderID: "id", Amount: 10, Status: resources.Unsettled}
	reconciler := &BillingReconciler{DBClient: db, AccountV2: account}
	if err := reconciler.reconcileBilling("owner", []*resources.Billing{billing}); err == nil {
		t.Fatal("expected deduction failure")
	}
	if len(db.saved) != 1 {
		t.Fatalf("saved billing count = %d", len(db.saved))
	}
	if _, settled := db.statuses[billing.OrderID]; settled {
		t.Fatal("failed deduction was marked settled")
	}
}

func TestClassifyGeneratedBillingsDoesNotReclassifyExistingUnsettled(t *testing.T) {
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
	if statuses["new-usage"] != resources.Unsettled {
		t.Fatalf("new usage status = %v", statuses["new-usage"])
	}
	if statuses[existing.OrderID] != resources.Unsettled {
		t.Fatalf("existing unsettled status = %v", statuses[existing.OrderID])
	}
}

func TestReconcileBillingIsIdempotentPerBillingID(t *testing.T) {
	initBillingTestGlobals()
	db := &billingTestAccount{}
	account := &billingTestAccountV2{}
	billing := &resources.Billing{OrderID: "stable-id", Amount: 10, Status: resources.Unsettled}
	reconciler := &BillingReconciler{DBClient: db, AccountV2: account}
	for range 2 {
		if err := reconciler.reconcileBilling("owner", []*resources.Billing{billing}); err != nil {
			t.Fatal(err)
		}
	}
	if account.deductions != 1 {
		t.Fatalf("deductions = %d", account.deductions)
	}
}

func TestPendingOwnerBillingsRecoversOnlyMissingAndUnsettled(t *testing.T) {
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
	if len(got) != 3 {
		t.Fatalf("pending = %#v", pending)
	}
	for _, orderID := range []string{"bh_existing-b", "bh_orphan-d", "new-c"} {
		if _, exists := got[orderID]; !exists {
			t.Fatalf("pending billing %s is missing: %#v", orderID, pending)
		}
	}
}

func TestAddUnsettledBillingOwnersRestoresOwnersWithoutMonitorData(t *testing.T) {
	owners := map[string][]string{}
	addUnsettledBillingOwners(owners, map[string][]*resources.Billing{
		"owner": {
			{Namespace: "ns-a"},
			{Namespace: "ns-a"},
			{Namespace: "ns-b"},
		},
	})
	if len(owners["owner"]) != 2 || owners["owner"][0] != "ns-a" || owners["owner"][1] != "ns-b" {
		t.Fatalf("owners = %#v", owners)
	}
}

func TestDebtOwnersOnlyGenerateRecoveredUnsettledBillings(t *testing.T) {
	initBillingTestGlobals()
	debtUserUID := uuid.New()
	DebtUserMap.Set(debtUserUID.String())
	db := &billingTestAccount{existing: map[string][]*resources.Billing{
		"debt-owner": {{
			OrderID: "bh_debt-recovery", Owner: "debt-owner", Namespace: "ns-debt",
			Status: resources.Unsettled,
		}},
	}}
	var reconciled []*resources.Billing
	reconciler := &BillingReconciler{
		DBClient:        db,
		Logger:          logr.Discard(),
		concurrentLimit: 1,
		debtOwnerMap:    maps.NewConcurrentNullValueMap(),
		reconcileBillingFunc: func(_ string, billings []*resources.Billing) error {
			reconciled = append(reconciled, billings...)
			return nil
		},
	}
	owners := map[string][]string{
		"debt-owner":   {"ns-debt"},
		"normal-owner": {"ns-normal"},
	}
	reconciler.removeDebtOwners(owners, map[string]uuid.UUID{
		"debt-owner": debtUserUID,
	})
	if _, exists := owners["debt-owner"]; exists {
		t.Fatal("monitor-backed debt owner remained in generation input")
	}

	addUnsettledBillingOwners(owners, map[string][]*resources.Billing{
		"debt-owner": {{Namespace: "ns-debt"}},
	})
	if err := reconciler.reconcileOwnerList(owners, time.Now()); err != nil {
		t.Fatal(err)
	}
	if _, exists := db.generateInput["debt-owner"]; exists {
		t.Fatal("recovered debt owner was included in new billing generation")
	}
	if _, exists := db.generateInput["normal-owner"]; !exists {
		t.Fatal("normal owner was excluded from new billing generation")
	}
	if len(reconciled) != 1 || reconciled[0].OrderID != "bh_debt-recovery" {
		t.Fatalf("reconciled = %#v", reconciled)
	}
}
