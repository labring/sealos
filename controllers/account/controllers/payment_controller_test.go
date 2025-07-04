package controllers

import (
	"context"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/golang/mock/gomock"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/pay"
	pkgtypes "github.com/labring/sealos/controllers/pkg/types"
	"github.com/stretchr/testify/assert"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestPaymentReconciler_SetupWithManager(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	tests := []struct {
		name    string
		env     map[string]string
		wantErr bool
	}{
		{
			name: "default setup",
			env:  map[string]string{},
		},
		{
			name: "with custom durations",
			env: map[string]string{
				EnvPaymentReconcileDuration: "20s",
				EnvPaymentCreateDuration:    "10s",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for k, v := range tt.env {
				os.Setenv(k, v)
				defer os.Unsetenv(k)
			}

			r := &PaymentReconciler{
				Client: fake.NewClientBuilder().Build(),
				Account: &AccountReconciler{
					AccountV2: &MockAccountV2{ctrl: ctrl},
				},
			}

			mgr := &MockManager{}
			err := r.SetupWithManager(mgr)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestPaymentReconciler_reconcilePayment(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	scheme := runtime.NewScheme()
	_ = accountv1.AddToScheme(scheme)
	_ = scheme.AddKnownTypes(accountv1.GroupVersion, &accountv1.Payment{})

	tests := []struct {
		name    string
		payment *accountv1.Payment
		wantErr bool
	}{
		{
			name: "new payment",
			payment: &accountv1.Payment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-payment",
					Namespace: "default",
				},
				Spec: accountv1.PaymentSpec{
					UserID:        "test-user",
					Amount:        100,
					PaymentMethod: "wechat",
				},
			},
		},
		{
			name: "successful payment",
			payment: &accountv1.Payment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-payment",
					Namespace: "default",
				},
				Spec: accountv1.PaymentSpec{
					UserID:        "test-user",
					Amount:        100,
					PaymentMethod: "wechat",
				},
				Status: accountv1.PaymentStatus{
					TradeNO: "test-trade",
					Status:  pay.PaymentSuccess,
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &PaymentReconciler{
				Client: fake.NewClientBuilder().WithScheme(scheme).WithObjects(tt.payment).Build(),
				Account: &AccountReconciler{
					AccountV2: &MockAccountV2{ctrl: ctrl},
				},
				userLock: make(map[uuid.UUID]*sync.Mutex),
			}

			err := r.reconcilePayment(tt.payment)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

type MockManager struct{}

func (m *MockManager) Add(r manager.Runnable) error {
	return nil
}

type MockAccountV2 struct {
	ctrl *gomock.Controller
}

func (m *MockAccountV2) GetAccountConfig() (pkgtypes.AccountConfig, error) {
	return pkgtypes.AccountConfig{}, nil
}

func (m *MockAccountV2) GetUserUID(opts *pkgtypes.UserQueryOpts) (uuid.UUID, error) {
	return uuid.New(), nil
}

func (m *MockAccountV2) GetUserRechargeDiscount(opts *pkgtypes.UserQueryOpts) (*pkgtypes.UserRechargeDiscount, error) {
	return &pkgtypes.UserRechargeDiscount{}, nil
}

func (m *MockAccountV2) Payment(payment *pkgtypes.Payment) error {
	return nil
}

func (m *MockAccountV2) GetUserID(opts *pkgtypes.UserQueryOpts) (string, error) {
	return "test-user", nil
}

func (m *MockAccountV2) GetAccount(opts *pkgtypes.UserQueryOpts) (*pkgtypes.Account, error) {
	return &pkgtypes.Account{}, nil
}
