package controllers

import (
	"context"
	"testing"
	"time"

	v1 "github.com/labring/sealos/controllers/account/api/v1"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func Test_filterNormalNamespace(t *testing.T) {
	tests := []struct {
		name          string
		namespaceList *corev1.NamespaceList
		want          int
	}{
		{
			name: "filter suspend namespace",
			namespaceList: &corev1.NamespaceList{
				Items: []corev1.Namespace{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name: "test1",
							Annotations: map[string]string{
								v1.DebtNamespaceAnnoStatusKey: v1.SuspendDebtNamespaceAnnoStatus,
							},
						},
					},
					{
						ObjectMeta: metav1.ObjectMeta{
							Name: "test2",
							Annotations: map[string]string{
								v1.DebtNamespaceAnnoStatusKey: v1.SuspendCompletedDebtNamespaceAnnoStatus,
							},
						},
					},
					{
						ObjectMeta: metav1.ObjectMeta{
							Name: "test3",
							Annotations: map[string]string{
								v1.DebtNamespaceAnnoStatusKey: v1.FinalDeletionDebtNamespaceAnnoStatus,
							},
						},
					},
					{
						ObjectMeta: metav1.ObjectMeta{
							Name: "test4",
							Annotations: map[string]string{
								v1.DebtNamespaceAnnoStatusKey: v1.FinalDeletionCompletedDebtNamespaceAnnoStatus,
							},
						},
					},
					{
						ObjectMeta: metav1.ObjectMeta{
							Name: "test5",
						},
					},
				},
			},
			want: 1,
		},
		{
			name: "no filter namespace",
			namespaceList: &corev1.NamespaceList{
				Items: []corev1.Namespace{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name: "test1",
						},
					},
					{
						ObjectMeta: metav1.ObjectMeta{
							Name: "test2",
						},
					},
				},
			},
			want: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			filterNormalNamespace(tt.namespaceList)
			assert.Equal(t, tt.want, len(tt.namespaceList.Items))
		})
	}
}

func TestMonitorReconciler_getNamespaceList(t *testing.T) {
	r := &MonitorReconciler{
		periodicReconcile: 1 * time.Minute,
	}

	// Test empty namespace list
	namespaceList, err := r.getNamespaceList()
	assert.NoError(t, err)
	assert.NotNil(t, namespaceList)
}

func TestWaitNextMinute(t *testing.T) {
	start := time.Now()
	waitNextMinute()
	duration := time.Since(start)

	// Should wait until next minute
	assert.True(t, duration < 2*time.Minute)
	assert.True(t, duration > 0)
}

func TestWaitNextHour(t *testing.T) {
	start := time.Now()
	waitNextHour()
	duration := time.Since(start)

	// Should wait until next hour
	assert.True(t, duration < 2*time.Hour)
	assert.True(t, duration > 0)
}

func TestMonitorReconciler_StartReconciler(t *testing.T) {
	r := &MonitorReconciler{
		periodicReconcile: 1 * time.Second,
		stopCh:           make(chan struct{}),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	go func() {
		time.Sleep(1 * time.Second)
		close(r.stopCh)
	}()

	err := r.StartReconciler(ctx)
	assert.NoError(t, err)
}

func TestMonitorReconciler_processNamespaceList(t *testing.T) {
	r := &MonitorReconciler{}

	// Test empty namespace list
	err := r.processNamespaceList(&corev1.NamespaceList{})
	assert.NoError(t, err)

	// Test with namespace items
	namespaceList := &corev1.NamespaceList{
		Items: []corev1.Namespace{
			{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-ns",
				},
			},
		},
	}
	err = r.processNamespaceList(namespaceList)
	assert.NoError(t, err)
}
