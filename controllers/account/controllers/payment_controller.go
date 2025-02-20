/*
Copyright 2022 labring.

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
	"sync"
	"time"

	"github.com/labring/sealos/controllers/pkg/utils/env"

	"github.com/google/uuid"

	"sigs.k8s.io/controller-runtime/pkg/manager"

	pkgtypes "github.com/labring/sealos/controllers/pkg/types"

	"github.com/labring/sealos/controllers/pkg/pay"

	"github.com/go-logr/logr"
	"k8s.io/apimachinery/pkg/runtime"

	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
)

// PaymentReconciler reconciles a Payment object
type PaymentReconciler struct {
	client.Client
	Account           *AccountReconciler
	WatchClient       client.WithWatch
	Scheme            *runtime.Scheme
	Logger            logr.Logger
	reconcileDuration time.Duration
	createDuration    time.Duration
	accountConfig     pkgtypes.AccountConfig
	userLock          map[uuid.UUID]*sync.Mutex
	domain            string
}

var (
	// Ensure PaymentReconciler implements the LeaderElectionRunnable and Runnable interface
	_ manager.LeaderElectionRunnable = &PaymentReconciler{}
	_ manager.Runnable               = &PaymentReconciler{}
)

const (
	EnvPaymentReconcileDuration = "PAYMENT_RECONCILE_DURATION"
	EnvPaymentCreateDuration    = "PAYMENT_CREATE_DURATION"

	defaultReconcileDuration = 10 * time.Second
	defaultCreateDuration    = 5 * time.Second
)

//+kubebuilder:rbac:groups=account.sealos.io,resources=payments,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=payments/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=account.sealos.io,resources=payments/finalizers,verbs=update

// SetupWithManager sets up the controller with the Manager.
func (r *PaymentReconciler) SetupWithManager(mgr ctrl.Manager) (err error) {
	const controllerName = "payment_controller"
	r.Logger = ctrl.Log.WithName(controllerName)
	r.Logger.V(1).Info("init reconcile controller payment")
	r.domain = os.Getenv("DOMAIN")
	r.reconcileDuration = defaultReconcileDuration
	r.createDuration = defaultCreateDuration
	r.userLock = make(map[uuid.UUID]*sync.Mutex)
	if duration := os.Getenv(EnvPaymentReconcileDuration); duration != "" {
		reconcileDuration, err := time.ParseDuration(duration)
		if err == nil {
			r.reconcileDuration = reconcileDuration
		}
	}
	if duration := os.Getenv(EnvPaymentCreateDuration); duration != "" {
		createDuration, err := time.ParseDuration(duration)
		if err == nil {
			r.createDuration = createDuration
		}
	}
	r.accountConfig, err = r.Account.AccountV2.GetAccountConfig()
	if err != nil {
		return fmt.Errorf("get account config failed: %w", err)
	}
	if len(r.accountConfig.DefaultDiscountSteps) == 0 {
		r.Logger.Info("default discount steps is empty, use default value")
	}
	r.Logger.V(1).Info("account config", "config", r.accountConfig)
	r.Logger.V(1).Info("reconcile duration", "reconcileDuration", r.reconcileDuration, "createDuration", r.createDuration)
	if err := mgr.Add(r); err != nil {
		return fmt.Errorf("add payment controller failed: %w", err)
	}
	return nil
}

// LeaderElectionRunnable knows if a Runnable needs to be run in the leader election mode.
func (r *PaymentReconciler) NeedLeaderElection() bool {
	return true
}

func (r *PaymentReconciler) Start(ctx context.Context) error {
	var wg sync.WaitGroup
	defer wg.Wait()
	fc := func(wg *sync.WaitGroup, t *time.Ticker, reconcileFunc func(ctx context.Context) []error) {
		wg.Add(1)
		defer wg.Done()
		for {
			select {
			case <-t.C:
				if errs := reconcileFunc(ctx); len(errs) > 0 {
					for _, err := range errs {
						r.Logger.Error(err, "reconcile payments failed")
					}
				}
			case <-ctx.Done():
				return
			}
		}
	}
	tickerReconcilePayment := time.NewTicker(r.reconcileDuration)
	tickerNewPayment := time.NewTicker(r.createDuration)
	go fc(&wg, tickerReconcilePayment, r.reconcilePayments)
	go fc(&wg, tickerNewPayment, r.reconcileCreatePayments)
	return nil
}

func (r *PaymentReconciler) reconcilePayments(_ context.Context) (errs []error) {
	paymentList := &accountv1.PaymentList{}
	err := r.Client.List(context.Background(), paymentList, &client.ListOptions{})
	if err != nil {
		errs = append(errs, fmt.Errorf("watch payment failed: %w", err))
		return
	}
	for _, payment := range paymentList.Items {
		if err := r.reconcilePayment(&payment); err != nil {
			errs = append(errs, fmt.Errorf("reconcile payment failed: payment: %s, user: %s, err: %w", payment.Name, payment.Spec.UserID, err))
		}
	}
	return
}

func (r *PaymentReconciler) reconcileCreatePayments(ctx context.Context) (errs []error) {
	watcher, err := r.WatchClient.Watch(context.Background(), &accountv1.PaymentList{}, &client.ListOptions{})
	if err != nil {
		errs = append(errs, fmt.Errorf("watch payment failed: %w", err))
		return
	}
	select {
	case <-ctx.Done():
		return
	case event := <-watcher.ResultChan():
		if event.Object == nil {
			break
		}
		payment, ok := event.Object.(*accountv1.Payment)
		if !ok {
			errs = append(errs, fmt.Errorf("convert payment failed: %v", event.Object))
			break
		}
		if err := r.reconcileNewPayment(payment); err != nil {
			errs = append(errs, fmt.Errorf("reconcile payment failed: payment: %s, user: %s, err: %w", payment.Name, payment.Spec.UserID, err))
		}
	}
	return
}

func (r *PaymentReconciler) reconcilePayment(payment *accountv1.Payment) error {
	if payment.Status.TradeNO == "" {
		if err := r.reconcileNewPayment(payment); err != nil {
			return fmt.Errorf("reconcile new payment failed: %w", err)
		}
		return nil
	}
	if payment.Status.Status == pay.PaymentSuccess {
		if err := r.expiredOvertimePayment(payment); err != nil {
			return fmt.Errorf("expired payment failed: %w", err)
		}
		return nil
	}
	// get payment handler
	payHandler, err := pay.NewPayHandler(payment.Spec.PaymentMethod)
	if err != nil {
		return fmt.Errorf("get payment Interface failed: %w", err)
	}
	// TODO The GetPaymentDetails may cause issues when using Stripe
	status, orderAmount, err := payHandler.GetPaymentDetails(payment.Status.TradeNO)
	if err != nil {
		return fmt.Errorf("get payment details failed: %w", err)
	}
	switch status {
	case pay.PaymentSuccess:
		user, err := r.Account.AccountV2.GetUser(&pkgtypes.UserQueryOpts{ID: payment.Spec.UserID})
		if err != nil {
			return fmt.Errorf("get user failed: %w", err)
		}
		if r.userLock[user.UID] == nil {
			r.userLock[user.UID] = &sync.Mutex{}
		}
		r.userLock[user.UID].Lock()
		defer r.userLock[user.UID].Unlock()
		userDiscount, err := r.Account.AccountV2.GetUserRechargeDiscount(&pkgtypes.UserQueryOpts{ID: payment.Spec.UserID})
		if err != nil {
			return fmt.Errorf("get user discount failed: %w", err)
		}
		//1¥ = 100WechatPayAmount; 1 WechatPayAmount = 10000 SealosAmount
		payAmount := orderAmount * 10000
		isFirstRecharge, gift := getFirstRechargeDiscount(payAmount, userDiscount)
		paymentRaw := pkgtypes.PaymentRaw{
			UserUID:         user.UID,
			Amount:          payAmount,
			Gift:            gift,
			CreatedAt:       payment.CreationTimestamp.Time,
			RegionUserOwner: getUsername(payment.Namespace),
			Method:          payment.Spec.PaymentMethod,
			TradeNO:         payment.Status.TradeNO,
			CodeURL:         payment.Status.CodeURL,
		}
		if isFirstRecharge {
			paymentRaw.ActivityType = pkgtypes.ActivityTypeFirstRecharge
		}

		if err = r.Account.AccountV2.Payment(&pkgtypes.Payment{
			PaymentRaw: paymentRaw,
		}); err != nil {
			return fmt.Errorf("payment failed: %w", err)
		}
		payment.Status.Status = pay.PaymentSuccess
		if err := r.Status().Update(context.Background(), payment); err != nil {
			return fmt.Errorf("update payment failed: %w", err)
		}
	//case pay.PaymentFailed, pay.PaymentExpired:
	default:
		if err := r.expiredOvertimePayment(payment); err != nil {
			return fmt.Errorf("expired payment failed: %w", err)
		}
	}
	return nil
}

func (r *PaymentReconciler) expiredOvertimePayment(payment *accountv1.Payment) error {
	if payment.CreationTimestamp.Time.Add(10 * time.Minute).After(time.Now()) {
		return nil
	}
	payHandler, err := pay.NewPayHandler(payment.Spec.PaymentMethod)
	if err != nil {
		return fmt.Errorf("get payment Interface failed: %w", err)
	}
	currentStatus, _, err := payHandler.GetPaymentDetails(payment.Status.TradeNO)
	if err != nil {
		return fmt.Errorf("get payment details failed: %w", err)
	}

	if payment.Status.Status != pay.PaymentSuccess {
		// skip if payment is success paid
		if currentStatus == pay.PaymentSuccess {
			return nil
		}
		if err = payHandler.ExpireSession(payment.Status.TradeNO); err != nil {
			r.Logger.Error(err, "cancel payment failed")
		}
	}
	if err = r.Delete(context.Background(), payment); err != nil {
		r.Logger.Error(err, "delete payment failed")
	}
	r.Logger.Info("payment expired", "payment", payment)
	return nil
}

func (r *PaymentReconciler) reconcileNewPayment(payment *accountv1.Payment) error {
	if payment.Status.TradeNO != "" {
		return nil
	}
	// backward compatibility
	if payment.Spec.UserCR == "" {
		if payment.Spec.UserID == "" {
			return fmt.Errorf("user ID is empty")
		}
		payment.Spec.UserCR = payment.Spec.UserID
		user, err := r.Account.AccountV2.GetUser(&pkgtypes.UserQueryOpts{Owner: payment.Spec.UserCR})
		if err != nil {
			return fmt.Errorf("get user failed: %w", err)
		}
		if user == nil {
			return fmt.Errorf("user not found")
		}
		payment.Spec.UserID = user.ID
	}
	if err := r.Update(context.Background(), payment); err != nil {
		return fmt.Errorf("create payment failed: %w", err)
	}
	// get user ID
	account, err := r.Account.AccountV2.GetAccount(&pkgtypes.UserQueryOpts{ID: payment.Spec.UserID, IgnoreEmpty: true})
	if err != nil {
		return fmt.Errorf("get account failed: %w", err)
	}
	if account == nil {
		_, err := r.Account.AccountV2.NewAccount(&pkgtypes.UserQueryOpts{ID: payment.Spec.UserID})
		if err != nil {
			return fmt.Errorf("create account failed: %w", err)
		}
	}
	// get payment handler
	payHandler, err := pay.NewPayHandler(payment.Spec.PaymentMethod)
	if err != nil {
		return fmt.Errorf("get payment Interface failed: %w", err)
	}
	tradeNO, codeURL, err := payHandler.CreatePayment(payment.Spec.Amount/10000, payment.Spec.UserID, fmt.Sprintf(env.GetEnvWithDefault("PAY_DESCRIBE_FORMAT", `sealos cloud pay [domain="%s"]`), r.domain))
	if err != nil {
		return fmt.Errorf("get tradeNO and codeURL failed: %w", err)
	}
	payment.Status.CodeURL = codeURL
	payment.Status.TradeNO = tradeNO
	payment.Status.Status = pay.PaymentProcessing
	if err = r.Status().Update(context.Background(), payment); err != nil {
		return fmt.Errorf("update payment failed: %w", err)
	}
	return nil
}
