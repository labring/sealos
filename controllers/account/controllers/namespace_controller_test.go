package controllers

import (
	"context"
	"testing"
	"time"

	"github.com/minio/madmin-go/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/utils/ptr"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	v1 "github.com/labring/sealos/controllers/account/api/v1"
	kbv1alpha1 "github.com/apecloud/kubeblocks/apis/apps/v1alpha1"
)

type mockClient struct {
	client.Client
	mock.Mock
}

func (m *mockClient) Watch(ctx context.Context, list client.ObjectList, opts ...client.ListOption) (watch.Interface, error) {
	args := m.Called(ctx, list, opts)
	return args.Get(0).(watch.Interface), args.Error(1)
}

type mockWatcher struct {
	mock.Mock
	resultChan chan watch.Event
}

func (m *mockWatcher) Stop() {
	m.Called()
}

func (m *mockWatcher) ResultChan() <-chan watch.Event {
	return m.resultChan
}

func TestNamespaceReconciler_Reconcile(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	_ = kbv1alpha1.AddToScheme(scheme)

	tests := []struct {
		name        string
		namespace   *corev1.Namespace
		wantErr     bool
		wantStatus  string
		annotations map[string]string
	}{
		{
			name: "normal status",
			namespace: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-ns",
					Annotations: map[string]string{
						v1.DebtNamespaceAnnoStatusKey: v1.NormalDebtNamespaceAnnoStatus,
					},
				},
			},
			wantErr:    false,
			wantStatus: v1.NormalDebtNamespaceAnnoStatus,
		},
		{
			name: "suspend status",
			namespace: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-ns",
					Annotations: map[string]string{
						v1.DebtNamespaceAnnoStatusKey: v1.SuspendDebtNamespaceAnnoStatus,
					},
				},
			},
			wantErr:    false,
			wantStatus: v1.SuspendDebtNamespaceAnnoStatus,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := fake.NewClientBuilder().WithScheme(scheme).WithObjects(tt.namespace).Build()

			r := &NamespaceReconciler{
				Client: client,
				Log:    ctrl.Log.WithName("test"),
				Scheme: scheme,
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

			ns := &corev1.Namespace{}
			err = client.Get(context.Background(), types.NamespacedName{Name: tt.namespace.Name}, ns)
			assert.NoError(t, err)
			assert.Equal(t, tt.wantStatus, ns.Annotations[v1.DebtNamespaceAnnoStatusKey])
		})
	}
}

func TestNamespaceReconciler_suspendCronJob(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = batchv1.AddToScheme(scheme)

	cronJob := &batchv1.CronJob{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-cronjob",
			Namespace: "test-ns",
		},
		Spec: batchv1.CronJobSpec{
			Schedule: "*/1 * * * *",
			Suspend:  ptr.To(false),
		},
	}

	client := fake.NewClientBuilder().WithScheme(scheme).WithObjects(cronJob).Build()

	r := &NamespaceReconciler{
		Client: client,
		Log:    ctrl.Log.WithName("test"),
		Scheme: scheme,
	}

	err := r.suspendCronJob(context.Background(), "test-ns")
	assert.NoError(t, err)

	updatedCronJob := &batchv1.CronJob{}
	err = client.Get(context.Background(), types.NamespacedName{Name: "test-cronjob", Namespace: "test-ns"}, updatedCronJob)
	assert.NoError(t, err)
	assert.True(t, *updatedCronJob.Spec.Suspend)
}

func TestGetLimit0ResourceQuota(t *testing.T) {
	quota := GetLimit0ResourceQuota("test-ns")
	assert.Equal(t, "debt-limit0", quota.Name)
	assert.Equal(t, "test-ns", quota.Namespace)
	assert.Equal(t, resource.MustParse("0"), quota.Spec.Hard[corev1.ResourceLimitsCPU])
	assert.Equal(t, resource.MustParse("0"), quota.Spec.Hard[corev1.ResourceLimitsMemory])
	assert.Equal(t, resource.MustParse("0"), quota.Spec.Hard[corev1.ResourceRequestsStorage])
}

func TestNamespaceReconciler_recreatePod(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)

	oldPod := corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-pod",
			Namespace: "test-ns",
		},
	}

	newPod := oldPod.DeepCopy()
	newPod.Spec.SchedulerName = v1.DebtSchedulerName

	mockWatch := &mockWatcher{
		resultChan: make(chan watch.Event, 1),
	}
	mockWatch.On("Stop").Return()

	mockClient := &mockClient{}
	mockClient.On("Watch", mock.Anything, mock.Anything, mock.Anything).Return(mockWatch, nil)
	mockClient.On("Delete", mock.Anything, mock.Anything).Return(nil)
	mockClient.On("Create", mock.Anything, mock.Anything).Return(nil)

	r := &NamespaceReconciler{
		Client: mockClient,
		Log:    ctrl.Log.WithName("test"),
		Scheme: scheme,
	}

	// Simulate pod deletion event
	go func() {
		time.Sleep(100 * time.Millisecond)
		mockWatch.resultChan <- watch.Event{
			Type:   watch.Deleted,
			Object: &oldPod,
		}
	}()

	err := r.recreatePod(context.Background(), oldPod, newPod)
	assert.NoError(t, err)

	mockWatch.AssertExpectations(t)
	mockClient.AssertExpectations(t)
}
