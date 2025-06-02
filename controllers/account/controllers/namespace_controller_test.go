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
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	v1 "github/labring/sealos/controllers/account/api/v1"
)

func TestGetLimit0ResourceQuota(t *testing.T) {
	namespace := "test-namespace"

	quota := GetLimit0ResourceQuota(namespace)

	assert.Equal(t, "debt-limit0", quota.Name)
	assert.Equal(t, namespace, quota.Namespace)

	expectedResources := corev1.ResourceList{
		corev1.ResourceLimitsCPU:        resource.MustParse("0"),
		corev1.ResourceLimitsMemory:     resource.MustParse("0"),
		corev1.ResourceRequestsStorage:  resource.MustParse("0"),
		corev1.ResourceEphemeralStorage: resource.MustParse("0"),
	}

	assert.Equal(t, expectedResources, quota.Spec.Hard)
}

func TestNamespaceReconciler_limitResourceQuotaCreate(t *testing.T) {
	s := scheme.Scheme
	s.AddKnownTypes(v1.GroupVersion)

	namespace := "test-namespace"

	tests := []struct {
		name    string
		quota   *corev1.ResourceQuota
		wantErr bool
	}{
		{
			name:    "Create new quota",
			quota:   GetLimit0ResourceQuota(namespace),
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &NamespaceReconciler{
				Client: fake.NewClientBuilder().WithScheme(s).Build(),
			}

			err := r.limitResourceQuotaCreate(context.Background(), namespace)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)

			var quota corev1.ResourceQuota
			err = r.Client.Get(context.Background(), client.ObjectKey{
				Namespace: namespace,
				Name:      "debt-limit0",
			}, &quota)
			require.NoError(t, err)

			assert.Equal(t, tt.quota.Spec.Hard, quota.Spec.Hard)
		})
	}
}

func TestNamespaceReconciler_limitResourceQuotaDelete(t *testing.T) {
	s := scheme.Scheme
	s.AddKnownTypes(v1.GroupVersion)

	namespace := "test-namespace"
	quota := GetLimit0ResourceQuota(namespace)

	tests := []struct {
		name    string
		objects []runtime.Object
		wantErr bool
	}{
		{
			name:    "Delete existing quota",
			objects: []runtime.Object{quota},
			wantErr: false,
		},
		{
			name:    "Delete non-existing quota",
			objects: []runtime.Object{},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &NamespaceReconciler{
				Client: fake.NewClientBuilder().WithScheme(s).WithRuntimeObjects(tt.objects...).Build(),
			}

			err := r.limitResourceQuotaDelete(context.Background(), namespace)
			if tt.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)

			var foundQuota corev1.ResourceQuota
			err = r.Client.Get(context.Background(), client.ObjectKey{
				Namespace: namespace,
				Name:      "debt-limit0",
			}, &foundQuota)
			assert.Error(t, err)
		})
	}
}

func TestAnnotationChangedPredicate_Update(t *testing.T) {
	tests := []struct {
		name     string
		oldObj   *corev1.Namespace
		newObj   *corev1.Namespace
		expected bool
	}{
		{
			name: "Status changed from normal to suspend",
			oldObj: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Annotations: map[string]string{
						v1.DebtNamespaceAnnoStatusKey: v1.NormalDebtNamespaceAnnoStatus,
					},
				},
			},
			newObj: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Annotations: map[string]string{
						v1.DebtNamespaceAnnoStatusKey: v1.SuspendDebtNamespaceAnnoStatus,
					},
				},
			},
			expected: true,
		},
		{
			name: "Status unchanged",
			oldObj: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Annotations: map[string]string{
						v1.DebtNamespaceAnnoStatusKey: v1.NormalDebtNamespaceAnnoStatus,
					},
				},
			},
			newObj: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Annotations: map[string]string{
						v1.DebtNamespaceAnnoStatusKey: v1.NormalDebtNamespaceAnnoStatus,
					},
				},
			},
			expected: false,
		},
		{
			name:     "No annotations",
			oldObj:   &corev1.Namespace{},
			newObj:   &corev1.Namespace{},
			expected: false,
		},
	}

	predicate := AnnotationChangedPredicate{}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := predicate.Update(client.UpdateEvent{
				ObjectOld: tt.oldObj,
				ObjectNew: tt.newObj,
			})
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestAnnotationChangedPredicate_Create(t *testing.T) {
	tests := []struct {
		name     string
		obj      *corev1.Namespace
		expected bool
	}{
		{
			name: "Create with suspend status",
			obj: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Annotations: map[string]string{
						v1.DebtNamespaceAnnoStatusKey: v1.SuspendDebtNamespaceAnnoStatus,
					},
				},
			},
			expected: true,
		},
		{
			name: "Create with normal status",
			obj: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Annotations: map[string]string{
						v1.DebtNamespaceAnnoStatusKey: v1.NormalDebtNamespaceAnnoStatus,
					},
				},
			},
			expected: false,
		},
		{
			name:     "Create without annotations",
			obj:      &corev1.Namespace{},
			expected: false,
		},
	}

	predicate := AnnotationChangedPredicate{}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := predicate.Create(client.CreateEvent{
				Object: tt.obj,
			})
			assert.Equal(t, tt.expected, result)
		})
	}
}

type mockDynamicClient struct {
	dynamic.Interface
}

func TestDeleteResource(t *testing.T) {
	client := &mockDynamicClient{}

	tests := []struct {
		name      string
		resource  string
		namespace string
		wantErr   bool
	}{
		{
			name:      "Delete known resource",
			resource:  "deploy",
			namespace: "test",
			wantErr:   false,
		},
		{
			name:      "Delete unknown resource",
			resource:  "unknown",
			namespace: "test",
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := deleteResource(client, tt.resource, tt.namespace)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestNamespaceReconciler_Reconcile(t *testing.T) {
	s := scheme.Scheme
	s.AddKnownTypes(v1.GroupVersion)

	tests := []struct {
		name      string
		namespace *corev1.Namespace
		wantErr   bool
	}{
		{
			name: "Namespace in terminating phase",
			namespace: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test",
				},
				Status: corev1.NamespaceStatus{
					Phase: corev1.NamespaceTerminating,
				},
			},
			wantErr: false,
		},
		{
			name: "Namespace without debt status annotation",
			namespace: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test",
				},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &NamespaceReconciler{
				Client: fake.NewClientBuilder().WithScheme(s).WithRuntimeObjects(tt.namespace).Build(),
			}

			_, err := r.Reconcile(context.Background(), client.ObjectKey{
				Name: tt.namespace.Name,
			}.Request())

			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
