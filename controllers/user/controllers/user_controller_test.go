package controllers

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	ciliumv2 "github.com/cilium/cilium/pkg/k8s/apis/cilium.io/v2"
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper/ratelimiter"
)

func TestUserReconciler_SetupWithManager(t *testing.T) {
	s := scheme.Scheme
	s.AddKnownTypes(userv1.GroupVersion, &userv1.User{})
	s.AddKnownTypes(ciliumv2.GroupVersion, &ciliumv2.CiliumNetworkPolicy{})

	fakeClient := fake.NewClientBuilder().WithScheme(s).Build()

	reconciler := &UserReconciler{
		Client: fakeClient,
		Scheme: s,
		Logger: ctrl.Log.WithName("test"),
		Recorder: record.NewFakeRecorder(10),
		config: &rest.Config{},
	}

	mgr := &mockManager{
		client: fakeClient,
		scheme: s,
	}

	opts := ratelimiter.RateLimiterOptions{
		MaxConcurrent: 1,
		QPS: 1,
		Burst: 1,
	}

	err := reconciler.SetupWithManager(mgr, opts, time.Second, time.Second*10, time.Second, true)
	require.NoError(t, err)
}

func TestUserReconciler_Reconcile(t *testing.T) {
	s := scheme.Scheme
	s.AddKnownTypes(userv1.GroupVersion, &userv1.User{})
	s.AddKnownTypes(ciliumv2.GroupVersion, &ciliumv2.CiliumNetworkPolicy{})

	fakeClient := fake.NewClientBuilder().WithScheme(s).Build()

	reconciler := &UserReconciler{
		Client: fakeClient,
		Scheme: s,
		Logger: ctrl.Log.WithName("test"),
		Recorder: record.NewFakeRecorder(10),
		config: &rest.Config{},
		networkPolicyEnabled: true,
		minRequeueDuration: time.Second,
		maxRequeueDuration: time.Second * 10,
	}

	user := &userv1.User{
		ObjectMeta: metav1.ObjectMeta{
			Name: "test-user",
			Annotations: map[string]string{
				userAnnotationOwnerKey: "test-owner",
			},
		},
		Spec: userv1.UserSpec{
			CSRExpirationSeconds: 3600,
		},
	}

	err := fakeClient.Create(context.Background(), user)
	require.NoError(t, err)

	req := ctrl.Request{
		NamespacedName: types.NamespacedName{
			Name: "test-user",
		},
	}

	result, err := reconciler.Reconcile(context.Background(), req)
	require.NoError(t, err)
	assert.True(t, result.RequeueAfter > 0)

	var updatedUser userv1.User
	err = fakeClient.Get(context.Background(), req.NamespacedName, &updatedUser)
	require.NoError(t, err)

	assert.Equal(t, userv1.UserActive, updatedUser.Status.Phase)
}

func TestRandTimeDurationBetween(t *testing.T) {
	tests := []struct {
		name string
		min  time.Duration
		max  time.Duration
	}{
		{
			name: "normal case",
			min:  time.Second,
			max:  time.Second * 10,
		},
		{
			name: "min equals max",
			min:  time.Second,
			max:  time.Second,
		},
		{
			name: "min greater than max",
			min:  time.Second * 10,
			max:  time.Second,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			duration := RandTimeDurationBetween(tt.min, tt.max)
			if tt.min >= tt.max {
				assert.Equal(t, tt.min, duration)
			} else {
				assert.GreaterOrEqual(t, duration, tt.min)
				assert.LessOrEqual(t, duration, tt.max)
			}
		})
	}
}

type mockManager struct {
	client client.Client
	scheme *runtime.Scheme
}

func (m *mockManager) GetClient() client.Client {
	return m.client
}

func (m *mockManager) GetScheme() *runtime.Scheme {
	return m.scheme
}

func (m *mockManager) GetConfig() *rest.Config {
	return &rest.Config{}
}

func (m *mockManager) GetEventRecorderFor(name string) record.EventRecorder {
	return record.NewFakeRecorder(10)
}

func (m *mockManager) GetCache() cache.Cache {
	return nil
}

func (m *mockManager) Add(runnable manager.Runnable) error {
	return nil
}

func (m *mockManager) Elected() <-chan struct{} {
	return make(chan struct{})
}

func (m *mockManager) Start(ctx context.Context) error {
	return nil
}
