package v1

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils/maps"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"

	"github.com/stretchr/testify/assert"
	admissionv1 "k8s.io/api/admission/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

func TestDebtValidate_Handle(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)

	tests := []struct {
		name           string
		userInfo       admission.UserInfo
		namespace      string
		operation     admissionv1.Operation
		kind          metav1.GroupVersionKind
		expectedAllow bool
		whitelist     string
	}{
		{
			name: "kubernetes admin user",
			userInfo: admission.UserInfo{
				Groups: []string{"system:masters"},
			},
			expectedAllow: true,
		},
		{
			name: "kube-system user",
			userInfo: admission.UserInfo{
				Groups: []string{"system:serviceaccounts:kube-system"},
			},
			expectedAllow: true,
		},
		{
			name: "delete operation",
			operation: admissionv1.Delete,
			expectedAllow: true,
		},
		{
			name: "whitelisted resource",
			userInfo: admission.UserInfo{
				Groups: []string{"system:serviceaccounts:user-system"},
			},
			kind: metav1.GroupVersionKind{
				Group: "account.sealos.io",
				Kind: "Payment",
				Version: "v1",
			},
			whitelist: "payments.Payment.account.sealos.io/v1",
			expectedAllow: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Setenv("WHITELIST", tt.whitelist)
			defer os.Unsetenv("WHITELIST")

			client := fake.NewClientBuilder().WithScheme(scheme).Build()

			validator := &DebtValidate{
				Client: client,
				TTLUserMap: maps.NewTTLMap[*types.UsableBalanceWithCredits](60),
			}

			req := admission.Request{
				AdmissionRequest: admissionv1.AdmissionRequest{
					UserInfo: tt.userInfo,
					Operation: tt.operation,
					Kind: tt.kind,
				},
			}

			resp := validator.Handle(context.Background(), req)
			assert.Equal(t, tt.expectedAllow, resp.Allowed)
		})
	}
}

func TestDebtValidate_checkOption(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)

	tests := []struct {
		name          string
		namespace     string
		user          string
		balance       float64
		credits       float64
		deductions    float64
		expectedAllow bool
	}{
		{
			name: "namespace not found",
			namespace: "nonexistent",
			expectedAllow: true,
		},
		{
			name: "non-user namespace",
			namespace: "test-ns",
			expectedAllow: false,
		},
		{
			name: "sufficient balance",
			namespace: "user-ns",
			user: "testuser",
			balance: 100,
			credits: 50,
			deductions: 50,
			expectedAllow: true,
		},
		{
			name: "insufficient balance",
			namespace: "user-ns",
			user: "testuser",
			balance: 10,
			credits: 20,
			deductions: 50,
			expectedAllow: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ns := &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: tt.namespace,
					Labels: map[string]string{},
				},
			}
			if tt.user != "" {
				ns.Labels[userv1.UserLabelOwnerKey] = tt.user
			}

			client := fake.NewClientBuilder().
				WithScheme(scheme).
				WithObjects(ns).
				Build()

			mockDB := &cockroach.Cockroach{}
			validator := &DebtValidate{
				Client: client,
				AccountV2: mockDB,
				TTLUserMap: maps.NewTTLMap[*types.UsableBalanceWithCredits](60),
			}

			resp := validator.checkOption(context.Background(), logger, client, tt.namespace)
			assert.Equal(t, tt.expectedAllow, resp.Allowed)
		})
	}
}

func TestIsDefaultQuotaName(t *testing.T) {
	tests := []struct {
		name     string
		quotaName string
		expected bool
	}{
		{
			name: "quota prefix",
			quotaName: "quota-test",
			expected: true,
		},
		{
			name: "debt limit quota",
			quotaName: "debt-limit0",
			expected: true,
		},
		{
			name: "regular name",
			quotaName: "test-quota",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isDefaultQuotaName(tt.quotaName)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGetAccountDebtBalance(t *testing.T) {
	tests := []struct {
		name     string
		account  *types.UsableBalanceWithCredits
		expected float64
	}{
		{
			name: "positive balance",
			account: &types.UsableBalanceWithCredits{
				Balance: 100,
				UsableCredits: 50,
				DeductionBalance: 30,
			},
			expected: 120,
		},
		{
			name: "negative balance",
			account: &types.UsableBalanceWithCredits{
				Balance: 10,
				UsableCredits: 20,
				DeductionBalance: 50,
			},
			expected: -20,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GetAccountDebtBalance(tt.account)
			assert.Equal(t, tt.expected, result)
		})
	}
}
