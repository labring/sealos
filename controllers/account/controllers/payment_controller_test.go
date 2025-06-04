package controllers

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/labring/sealos/controllers/pkg/pay"
	pkgtypes "github.com/labring/sealos/controllers/pkg/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

type MockAccountV2 struct {
	mock.Mock
}

func (m *MockAccountV2) GetUserID(opts *pkgtypes.UserQueryOpts) (string, error) {
	args := m.Called(opts)
	return args.String(0), args.Error(1)
}

func (m *MockAccountV2) GetUserUID(opts *pkgtypes.UserQueryOpts) (uuid.UUID, error) {
	args := m.Called(opts)
	return args.Get(0).(uuid.UUID), args.Error(1)
}

func (m *MockAccountV2) GetAccountConfig() (pkgtypes.AccountConfig, error) {
	args := m.Called()
	return args.Get(0).(pkgtypes.AccountConfig), args.Error(1)
}

func (m *MockAccountV2) GetUserRechargeDiscount(opts *pkgtypes.UserQueryOpts) (*pkgtypes.UserDiscount, error) {
	args := m.Called(opts)
	return args.Get(0).(*pkgtypes.UserDiscount), args.Error(1)
}

func (m *MockAccountV2) GetAccount(opts *pkgtypes.UserQueryOpts) (*pkgtypes.Account, error) {
	args := m.Called(opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*pkgtypes.Account), args.Error(1)
}

func (m *MockAccountV2) Payment(payment *pkgtypes.Payment) error {
	args := m.Called(payment)
	return args.Error(0)
}

func TestPaymentReconciler_reconcileNewPayment(t *testing.T) {
	s := scheme.Scheme
	if err := accountv1.AddToScheme(s); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name     string
		payment  *accountv1.Payment
		mockFunc func(*MockAccountV2)
		wantErr  bool
	}{
		{
			name: "empty userID",
			payment: &accountv1.Payment{
				Spec: accountv1.PaymentSpec{
					UserID: "",
				},
			},
			mockFunc: func(m *MockAccountV2) {},
			wantErr:  true,
		},
		{
			name: "get userID error",
			payment: &accountv1.Payment{
				Spec: accountv1.PaymentSpec{
					UserID: "",
					UserCR: "testuser",
				},
			},
			mockFunc: func(m *MockAccountV2) {
				m.On("GetUserID", mock.Anything).Return("", fmt.Errorf("mock error"))
			},
			wantErr: true,
		},
		{
			name: "successful reconcile",
			payment: &accountv1.Payment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-payment",
					Namespace: "default",
				},
				Spec: accountv1.PaymentSpec{
					UserID:         "user1",
					UserCR:        "user1",
					PaymentMethod: "wechat",
					Amount:       1000,
				},
			},
			mockFunc: func(m *MockAccountV2) {
				m.On("GetAccount", mock.Anything).Return(&pkgtypes.Account{}, nil)
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockAccount := &MockAccountV2{}
			tt.mockFunc(mockAccount)

			r := &PaymentReconciler{
				Client: fake.NewClientBuilder().WithScheme(s).WithObjects(tt.payment).Build(),
				Account: &AccountReconciler{
					AccountV2: mockAccount,
				},
				domain: "test.domain",
			}

			err := r.reconcileNewPayment(tt.payment)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestPaymentReconciler_SetupWithManager(t *testing.T) {
	r := &PaymentReconciler{
		Account: &AccountReconciler{
			AccountV2: &MockAccountV2{},
		},
	}

	mockAccount := r.Account.AccountV2.(*MockAccountV2)
	mockAccount.On("GetAccountConfig").Return(pkgtypes.AccountConfig{}, nil)

	os.Setenv(EnvPaymentReconcileDuration, "15s")
	os.Setenv(EnvPaymentCreateDuration, "10s")

	err := r.SetupWithManager(nil)
	assert.Error(t, err) // Should error since manager is nil
}

func TestPaymentReconciler_reconcilePayment(t *testing.T) {
	s := scheme.Scheme
	if err := accountv1.AddToScheme(s); err != nil {
		t.Fatal(err)
	}

	payment := &accountv1.Payment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-payment",
			Namespace: "default",
			CreationTimestamp: metav1.Time{
				Time: time.Now(),
			},
		},
		Spec: accountv1.PaymentSpec{
			UserID:         "user1",
			PaymentMethod: "wechat",
			Amount:       1000,
		},
		Status: accountv1.PaymentStatus{
			TradeNO: "test-trade",
			Status:  pay.PaymentProcessing,
		},
	}

	mockAccount := &MockAccountV2{}
	mockAccount.On("GetUserUID", mock.Anything).Return(uuid.New(), nil)
	mockAccount.On("GetUserRechargeDiscount", mock.Anything).Return(&pkgtypes.UserDiscount{}, nil)
	mockAccount.On("Payment", mock.Anything).Return(nil)

	r := &PaymentReconciler{
		Client: fake.NewClientBuilder().WithScheme(s).WithObjects(payment).Build(),
		Account: &AccountReconciler{
			AccountV2: mockAccount,
		},
		userLock: make(map[uuid.UUID]*sync.Mutex),
	}

	err := r.reconcilePayment(payment)
	assert.NoError(t, err)
}
