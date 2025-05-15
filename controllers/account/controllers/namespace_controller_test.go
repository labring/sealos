package controllers

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/minio/madmin-go/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"

	v1 "github/labring/sealos/controllers/account/api/v1"
)

type mockDynamicClient struct {
	mock.Mock
}

func (m *mockDynamicClient) Resource(gvr schema.GroupVersionResource) dynamic.NamespaceableResourceInterface {
	args := m.Called(gvr)
	return args.Get(0).(dynamic.NamespaceableResourceInterface)
}

func TestNamespaceReconciler_Reconcile(t *testing.T) {
	ctrl.SetLogger(zap.New(zap.UseDevMode(true)))
	s := scheme.Scheme

	tests := []struct {
		name      string
		namespace *corev1.Namespace
		wantErr   bool
	}{
		{
			name: "normal namespace",
			namespace: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-ns",
					Annotations: map[string]string{
						v1.DebtNamespaceAnnoStatusKey: v1.NormalDebtNamespaceAnnoStatus,
					},
				},
			},
			wantErr: false,
		},
		{
			name: "suspend namespace",
			namespace: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-ns",
					Annotations: map[string]string{
						v1.DebtNamespaceAnnoStatusKey: v1.SuspendDebtNamespaceAnnoStatus,
					},
				},
			},
			wantErr: false,
		},
		{
			name: "terminating namespace",
			namespace: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-ns",
					Annotations: map[string]string{
						v1.DebtNamespaceAnnoStatusKey: v1.FinalDeletionDebtNamespaceAnnoStatus,
					},
				},
				Status: corev1.NamespaceStatus{
					Phase: corev1.NamespaceTerminating,
				},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fakeClient := fake.NewClientBuilder().WithScheme(s).WithObjects(tt.namespace).Build()
			mockDynamicClient := &mockDynamicClient{}

			r := &NamespaceReconciler{
				Client:        fakeClient,
				Log:          ctrl.Log.WithName("test"),
				Scheme:       s,
				dynamicClient: mockDynamicClient,
			}

			req := ctrl.Request{
				NamespacedName: types.NamespacedName{
					Name: tt.namespace.Name,
				},
			}

			_, err := r.Reconcile(context.Background(), req)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestNamespaceReconciler_SetupWithManager(t *testing.T) {
	s := scheme.Scheme
	fakeClient := fake.NewClientBuilder().WithScheme(s).Build()

	r := &NamespaceReconciler{
		Client: fakeClient,
		Log:    ctrl.Log.WithName("test"),
		Scheme: s,
	}

	mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{Scheme: s})
	if err != nil {
		t.Fatal(err)
	}

	limitOps := controller.Options{
		MaxConcurrentReconciles: 1,
	}

	err = r.SetupWithManager(mgr, limitOps)
	assert.NoError(t, err)
}

func TestAnnotationChangedPredicate(t *testing.T) {
	pred := AnnotationChangedPredicate{}

	oldNs := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: "test-ns",
			Annotations: map[string]string{
				v1.DebtNamespaceAnnoStatusKey: v1.NormalDebtNamespaceAnnoStatus,
			},
		},
	}

	newNs := oldNs.DeepCopy()
	newNs.Annotations[v1.DebtNamespaceAnnoStatusKey] = v1.SuspendDebtNamespaceAnnoStatus

	result := pred.Update(event.UpdateEvent{
		ObjectOld: oldNs,
		ObjectNew: newNs,
	})

	assert.True(t, result)

	// Test Create
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: "test-ns",
			Annotations: map[string]string{
				v1.DebtNamespaceAnnoStatusKey: v1.SuspendDebtNamespaceAnnoStatus,
			},
		},
	}

	result = pred.Create(event.CreateEvent{
		Object: ns,
	})

	assert.True(t, result)
}

func TestGetLimit0ResourceQuota(t *testing.T) {
	quota := GetLimit0ResourceQuota("test-ns")
	assert.Equal(t, "debt-limit0", quota.Name)
	assert.Equal(t, "test-ns", quota.Namespace)
	assert.NotNil(t, quota.Spec.Hard)
}
