package controllers

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/labring/sealos/controllers/account/api/v1"
	"github.com/minio/madmin-go/v3"
	"github.com/stretchr/testify/assert"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/utils/ptr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestNamespaceReconciler_Reconcile(t *testing.T) {
	s := scheme.Scheme
	s.AddKnownTypes(v1.GroupVersion)

	tests := []struct {
		name        string
		namespace   *corev1.Namespace
		wantStatus  string
		wantErr     bool
		wantRequeue bool
	}{
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
			wantStatus: v1.SuspendCompletedDebtNamespaceAnnoStatus,
			wantErr:    false,
		},
		{
			name: "resume namespace",
			namespace: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-ns",
					Annotations: map[string]string{
						v1.DebtNamespaceAnnoStatusKey: v1.ResumeDebtNamespaceAnnoStatus,
					},
				},
			},
			wantStatus: v1.ResumeCompletedDebtNamespaceAnnoStatus,
			wantErr:    false,
		},
		{
			name: "delete namespace resources",
			namespace: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-ns",
					Annotations: map[string]string{
						v1.DebtNamespaceAnnoStatusKey: v1.FinalDeletionDebtNamespaceAnnoStatus,
					},
				},
			},
			wantStatus: v1.FinalDeletionCompletedDebtNamespaceAnnoStatus,
			wantErr:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fakeClient := fake.NewClientBuilder().WithScheme(s).WithObjects(tt.namespace).Build()

			r := &NamespaceReconciler{
				Client:        fakeClient,
				Log:          ctrl.Log.WithName("test"),
				Scheme:       s,
				OSNamespace:  "test-ns",
				dynamicClient: &fakeDynamicClient{},
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

			var ns corev1.Namespace
			err = fakeClient.Get(context.Background(), client.ObjectKey{Name: tt.namespace.Name}, &ns)
			assert.NoError(t, err)
			assert.Equal(t, tt.wantStatus, ns.Annotations[v1.DebtNamespaceAnnoStatusKey])
		})
	}
}

func TestNamespaceReconciler_suspendCronJob(t *testing.T) {
	s := scheme.Scheme
	s.AddKnownTypes(batchv1.SchemeGroupVersion, &batchv1.CronJob{}, &batchv1.CronJobList{})

	cronJob := &batchv1.CronJob{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-cronjob",
			Namespace: "test-ns",
		},
		Spec: batchv1.CronJobSpec{
			Suspend: ptr.To(false),
		},
	}

	fakeClient := fake.NewClientBuilder().WithScheme(s).WithObjects(cronJob).Build()

	r := &NamespaceReconciler{
		Client: fakeClient,
		Log:    ctrl.Log.WithName("test"),
		Scheme: s,
	}

	err := r.suspendCronJob(context.Background(), "test-ns")
	assert.NoError(t, err)

	var cj batchv1.CronJob
	err = fakeClient.Get(context.Background(), client.ObjectKey{Name: "test-cronjob", Namespace: "test-ns"}, &cj)
	assert.NoError(t, err)
	assert.True(t, *cj.Spec.Suspend)
}

func TestNamespaceReconciler_limitResourceQuota(t *testing.T) {
	s := scheme.Scheme

	tests := []struct {
		name      string
		namespace string
		wantQuota *corev1.ResourceQuota
		wantErr   bool
	}{
		{
			name:      "create limit0 quota",
			namespace: "test-ns",
			wantQuota: &corev1.ResourceQuota{
				ObjectMeta: metav1.ObjectMeta{
					Name:      DebtLimit0Name,
					Namespace: "test-ns",
				},
				Spec: corev1.ResourceQuotaSpec{
					Hard: corev1.ResourceList{
						corev1.ResourceLimitsCPU:       resource.MustParse("0"),
						corev1.ResourceLimitsMemory:    resource.MustParse("0"),
						corev1.ResourceRequestsStorage: resource.MustParse("0"),
					},
				},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fakeClient := fake.NewClientBuilder().WithScheme(s).Build()

			r := &NamespaceReconciler{
				Client: fakeClient,
				Log:    ctrl.Log.WithName("test"),
				Scheme: s,
			}

			err := r.limitResourceQuotaCreate(context.Background(), tt.namespace)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				var quota corev1.ResourceQuota
				err = fakeClient.Get(context.Background(), client.ObjectKey{Name: DebtLimit0Name, Namespace: tt.namespace}, &quota)
				assert.NoError(t, err)
				assert.Equal(t, tt.wantQuota.Spec.Hard, quota.Spec.Hard)
			}
		})
	}
}

type fakeDynamicClient struct {
	dynamic.Interface
}

func (f *fakeDynamicClient) Resource(resource schema.GroupVersionResource) dynamic.NamespaceableResourceInterface {
	return &fakeDynamicResourceClient{}
}

type fakeDynamicResourceClient struct {
	dynamic.ResourceInterface
}

func (f *fakeDynamicResourceClient) Namespace(namespace string) dynamic.ResourceInterface {
	return f
}

func (f *fakeDynamicResourceClient) DeleteCollection(ctx context.Context, opts metav1.DeleteOptions, listOpts metav1.ListOptions) error {
	return nil
}

func TestAnnotationChangedPredicate_Update(t *testing.T) {
	tests := []struct {
		name     string
		oldObj   *corev1.Namespace
		newObj   *corev1.Namespace
		expected bool
	}{
		{
			name: "status changed",
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
			name: "status not changed",
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
	}

	predicate := AnnotationChangedPredicate{}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := predicate.Update(event.UpdateEvent{
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
			name: "normal status",
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
			name: "suspend status",
			obj: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Annotations: map[string]string{
						v1.DebtNamespaceAnnoStatusKey: v1.SuspendDebtNamespaceAnnoStatus,
					},
				},
			},
			expected: true,
		},
	}

	predicate := AnnotationChangedPredicate{}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := predicate.Create(event.CreateEvent{
				Object: tt.obj,
			})
			assert.Equal(t, tt.expected, result)
		})
	}
}
