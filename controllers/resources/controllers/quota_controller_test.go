package controllers

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestAdjustQuota(t *testing.T) {
	tests := []struct {
		name           string
		quota         *corev1.ResourceQuota
		expectUpdated bool
	}{
		{
			name: "below base limit",
			quota: &corev1.ResourceQuota{
				Spec: corev1.ResourceQuotaSpec{
					Hard: corev1.ResourceList{
						corev1.ResourceLimitsCPU: resource.MustParse("32"),
					},
				},
				Status: corev1.ResourceQuotaStatus{
					Used: corev1.ResourceList{
						corev1.ResourceLimitsCPU: resource.MustParse("16"),
					},
				},
			},
			expectUpdated: true,
		},
		{
			name: "above base limit with high usage",
			quota: &corev1.ResourceQuota{
				Spec: corev1.ResourceQuotaSpec{
					Hard: corev1.ResourceList{
						corev1.ResourceLimitsCPU: resource.MustParse("100"),
					},
				},
				Status: corev1.ResourceQuotaStatus{
					Used: corev1.ResourceList{
						corev1.ResourceLimitsCPU: resource.MustParse("80"),
					},
				},
			},
			expectUpdated: true,
		},
		{
			name: "at upper limit",
			quota: &corev1.ResourceQuota{
				Spec: corev1.ResourceQuotaSpec{
					Hard: corev1.ResourceList{
						corev1.ResourceLimitsCPU: resource.MustParse("200"),
					},
				},
				Status: corev1.ResourceQuotaStatus{
					Used: corev1.ResourceList{
						corev1.ResourceLimitsCPU: resource.MustParse("150"),
					},
				},
			},
			expectUpdated: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			updated := AdjustQuota(tt.quota)
			assert.Equal(t, tt.expectUpdated, updated)
		})
	}
}

func TestNamespaceQuotaReconciler_Reconcile(t *testing.T) {
	s := runtime.NewScheme()
	_ = corev1.AddToScheme(s)

	tests := []struct {
		name    string
		objects []runtime.Object
		wantErr bool
	}{
		{
			name: "quota exceeded event",
			objects: []runtime.Object{
				&corev1.Event{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "test-event",
						Namespace: "ns-test",
					},
					Reason:  "FailedCreate",
					Message: "exceeded quota",
				},
				&corev1.Namespace{
					ObjectMeta: metav1.ObjectMeta{
						Name: "ns-test",
					},
				},
				&corev1.ResourceQuota{
					ObjectMeta: metav1.ObjectMeta{
						Name:      "test-quota",
						Namespace: "ns-test",
					},
					Spec: corev1.ResourceQuotaSpec{
						Hard: corev1.ResourceList{
							corev1.ResourceLimitsCPU: resource.MustParse("32"),
						},
					},
					Status: corev1.ResourceQuotaStatus{
						Used: corev1.ResourceList{
							corev1.ResourceLimitsCPU: resource.MustParse("16"),
						},
					},
				},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &NamespaceQuotaReconciler{
				Client:              fake.NewClientBuilder().WithScheme(s).WithRuntimeObjects(tt.objects...).Build(),
				Scheme:              s,
				limitExpansionCycle: 24 * time.Hour,
				Recorder:            record.NewFakeRecorder(10),
				namespaceLocks:      make(map[string]*sync.Mutex),
			}

			_, err := r.Reconcile(context.Background(), ctrl.Request{
				NamespacedName: client.ObjectKey{
					Namespace: "ns-test",
					Name:      "test-event",
				},
			})

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestFormatQuantity(t *testing.T) {
	tests := []struct {
		name         string
		quantity    resource.Quantity
		resourceName corev1.ResourceName
		want        string
	}{
		{
			name:         "cpu cores",
			quantity:    resource.MustParse("2000m"),
			resourceName: corev1.ResourceLimitsCPU,
			want:        "2.00",
		},
		{
			name:         "memory in GiB",
			quantity:    resource.MustParse("2Gi"),
			resourceName: corev1.ResourceLimitsMemory,
			want:        "2Gi",
		},
		{
			name:         "storage in GiB",
			quantity:    resource.MustParse("10Gi"),
			resourceName: corev1.ResourceRequestsStorage,
			want:        "10Gi",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := formatQuantity(tt.quantity, tt.resourceName)
			assert.Equal(t, tt.want, got)
		})
	}
}
