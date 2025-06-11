package controllers

import (
	"context"
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/objectstorage"
	"github.com/labring/sealos/controllers/pkg/resources"
	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
)

func TestMonitorReconciler_monitorObjectStorageTraffic(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)

	tests := []struct {
		name     string
		lastObj  objstorage.Metrics
		currObj  objstorage.Metrics
		wantSent int64
	}{
		{
			name: "normal traffic increase",
			lastObj: objstorage.Metrics{
				"user1": {
					Sent: map[string]int64{
						"bucket1": 100,
					},
				},
			},
			currObj: objstorage.Metrics{
				"user1": {
					Sent: map[string]int64{
						"bucket1": 200,
					},
				},
			},
			wantSent: 100,
		},
		{
			name: "traffic decrease should report 0",
			lastObj: objstorage.Metrics{
				"user1": {
					Sent: map[string]int64{
						"bucket1": 200,
					},
				},
			},
			currObj: objstorage.Metrics{
				"user1": {
					Sent: map[string]int64{
						"bucket1": 100,
					},
				},
			},
			wantSent: 0,
		},
		{
			name: "handle -1 value",
			lastObj: objstorage.Metrics{
				"user1": {
					Sent: map[string]int64{
						"bucket1": 100,
					},
				},
			},
			currObj: objstorage.Metrics{
				"user1": {
					Sent: map[string]int64{
						"bucket1": -1,
					},
				},
			},
			wantSent: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &MonitorReconciler{
				Client:              fake.NewClientBuilder().WithScheme(scheme).Build(),
				Logger:              zap.New(),
				lastObjectMetrics:   tt.lastObj,
				currentObjectMetrics: tt.currObj,
			}

			err := r.monitorObjectStorageTraffic()
			assert.NoError(t, err)

			for user, metrics := range tt.currObj {
				for bucket, sent := range metrics.Sent {
					if sent == -1 {
						assert.Equal(t, tt.lastObj[user].Sent[bucket], r.currentObjectMetrics[user].Sent[bucket])
					}
				}
			}
		})
	}
}

func TestMonitorReconciler_getResourceUsed(t *testing.T) {
	r := &MonitorReconciler{
		Properties: &resources.PropertyTypeLS{
			StringMap: map[string]resources.PropertyType{
				corev1.ResourceCPU.String(): {
					Enum: 1,
					Unit: *resource.NewMilliQuantity(1000, resource.DecimalSI),
				},
				corev1.ResourceMemory.String(): {
					Enum: 2,
					Unit: *resource.NewQuantity(1024*1024*1024, resource.BinarySI),
				},
			},
		},
	}

	tests := []struct {
		name        string
		podResource map[corev1.ResourceName]*quantity
		wantEmpty   bool
		wantUsed    map[uint8]int64
	}{
		{
			name: "empty resources",
			podResource: map[corev1.ResourceName]*quantity{
				corev1.ResourceCPU:    {Quantity: resource.NewQuantity(0, resource.DecimalSI)},
				corev1.ResourceMemory: {Quantity: resource.NewQuantity(0, resource.BinarySI)},
			},
			wantEmpty: true,
			wantUsed:  map[uint8]int64{},
		},
		{
			name: "cpu and memory resources",
			podResource: map[corev1.ResourceName]*quantity{
				corev1.ResourceCPU:    {Quantity: resource.NewMilliQuantity(2000, resource.DecimalSI)},
				corev1.ResourceMemory: {Quantity: resource.NewQuantity(2*1024*1024*1024, resource.BinarySI)},
			},
			wantEmpty: false,
			wantUsed: map[uint8]int64{
				1: 2,
				2: 2,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isEmpty, used := r.getResourceUsed(tt.podResource)
			assert.Equal(t, tt.wantEmpty, isEmpty)
			assert.Equal(t, tt.wantUsed, used)
		})
	}
}

func TestMonitorReconciler_filterNormalNamespace(t *testing.T) {
	tests := []struct {
		name          string
		namespaceList *corev1.NamespaceList
		wantLen       int
	}{
		{
			name: "filter suspended namespaces",
			namespaceList: &corev1.NamespaceList{
				Items: []corev1.Namespace{
					{
						ObjectMeta: metav1.ObjectMeta{
							Name: "ns1",
						},
					},
					{
						ObjectMeta: metav1.ObjectMeta{
							Name: "ns2",
							Annotations: map[string]string{
								"account.sealos.io/debt-status": "suspended",
							},
						},
					},
				},
			},
			wantLen: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			filterNormalNamespace(tt.namespaceList)
			assert.Equal(t, tt.wantLen, len(tt.namespaceList.Items))
		})
	}
}

func TestMonitorReconciler_StartReconciler(t *testing.T) {
	r := &MonitorReconciler{
		Client:            fake.NewClientBuilder().Build(),
		Logger:            zap.New(),
		periodicReconcile: 1 * time.Second,
		stopCh:            make(chan struct{}),
	}

	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		time.Sleep(2 * time.Second)
		cancel()
	}()

	err := r.StartReconciler(ctx)
	assert.NoError(t, err)
}
