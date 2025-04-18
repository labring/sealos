package controllers

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestNamespaceQuotaReconciler_Reconcile(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)

	tests := []struct {
		name           string
		existingEvent  *corev1.Event
		existingQuota  *corev1.ResourceQuota
		expectedResult ctrl.Result
		expectError    bool
	}{
		{
			name: "quota exceeded event triggers update",
			existingEvent: &corev1.Event{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-event",
					Namespace: "ns-test",
				},
				Reason:  "FailedCreate",
				Message: "exceeded quota",
			},
			existingQuota: &corev1.ResourceQuota{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-quota",
					Namespace: "ns-test",
				},
				Spec: corev1.ResourceQuotaSpec{
					Hard: corev1.ResourceList{
						corev1.ResourceLimitsCPU: resource.MustParse("1"),
					},
				},
			},
			expectedResult: ctrl.Result{},
			expectError:    false,
		},
		{
			name:           "non-existent event",
			existingEvent:  nil,
			expectedResult: ctrl.Result{},
			expectError:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := fake.NewClientBuilder().WithScheme(scheme).Build()
			if tt.existingEvent != nil {
				err := client.Create(context.Background(), tt.existingEvent)
				require.NoError(t, err)
			}
			if tt.existingQuota != nil {
				err := client.Create(context.Background(), tt.existingQuota)
				require.NoError(t, err)
			}

			r := &NamespaceQuotaReconciler{
				Client:         client,
				Scheme:        scheme,
				Logger:        ctrl.Log.WithName("test"),
				Recorder:      &record.FakeRecorder{},
				namespaceLocks: make(map[string]*sync.Mutex),
			}

			result, err := r.Reconcile(context.Background(), ctrl.Request{
				NamespacedName: client.ObjectKey{
					Name:      "test-event",
					Namespace: "ns-test",
				},
			})

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			assert.Equal(t, tt.expectedResult, result)
		})
	}
}

func TestAdjustQuota(t *testing.T) {
	tests := []struct {
		name            string
		quota           *corev1.ResourceQuota
		expectedUpdated bool
	}{
		{
			name: "below base limit",
			quota: &corev1.ResourceQuota{
				Spec: corev1.ResourceQuotaSpec{
					Hard: corev1.ResourceList{
						corev1.ResourceLimitsCPU: resource.MustParse("32"),
					},
				},
			},
			expectedUpdated: true,
		},
		{
			name: "above upper limit",
			quota: &corev1.ResourceQuota{
				Spec: corev1.ResourceQuotaSpec{
					Hard: corev1.ResourceList{
						corev1.ResourceLimitsCPU: resource.MustParse("250"),
					},
				},
			},
			expectedUpdated: false,
		},
		{
			name: "between limits with high usage",
			quota: &corev1.ResourceQuota{
				Spec: corev1.ResourceQuotaSpec{
					Hard: corev1.ResourceList{
						corev1.ResourceLimitsCPU: resource.MustParse("100"),
					},
				},
				Status: corev1.ResourceQuotaStatus{
					Used: corev1.ResourceList{
						corev1.ResourceLimitsCPU: resource.MustParse("60"),
					},
				},
			},
			expectedUpdated: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			updated := AdjustQuota(tt.quota)
			assert.Equal(t, tt.expectedUpdated, updated)
		})
	}
}

func TestFormatQuantity(t *testing.T) {
	tests := []struct {
		name         string
		quantity    resource.Quantity
		resourceName corev1.ResourceName
		expected    string
	}{
		{
			name:         "CPU in cores",
			quantity:    resource.MustParse("2000m"),
			resourceName: corev1.ResourceLimitsCPU,
			expected:    "2.00",
		},
		{
			name:         "CPU in millicores",
			quantity:    resource.MustParse("500m"),
			resourceName: corev1.ResourceLimitsCPU,
			expected:    "500m",
		},
		{
			name:         "Memory in GiB",
			quantity:    resource.MustParse("4Gi"),
			resourceName: corev1.ResourceLimitsMemory,
			expected:    "4Gi",
		},
		{
			name:         "Memory in MiB",
			quantity:    resource.MustParse("100Mi"),
			resourceName: corev1.ResourceLimitsMemory,
			expected:    "100Mi",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := formatQuantity(tt.quantity, tt.resourceName)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGetResourceUsage(t *testing.T) {
	tests := []struct {
		name         string
		status       corev1.ResourceQuotaStatus
		resourceName corev1.ResourceName
		expectError  bool
	}{
		{
			name: "resource exists",
			status: corev1.ResourceQuotaStatus{
				Used: corev1.ResourceList{
					corev1.ResourceLimitsCPU: resource.MustParse("1"),
				},
			},
			resourceName: corev1.ResourceLimitsCPU,
			expectError:  false,
		},
		{
			name: "resource does not exist",
			status: corev1.ResourceQuotaStatus{
				Used: corev1.ResourceList{},
			},
			resourceName: corev1.ResourceLimitsCPU,
			expectError:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := getResourceUsage(tt.resourceName, tt.status)
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
