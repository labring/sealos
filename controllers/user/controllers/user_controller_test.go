package controllers

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/rest"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper/finalizer"
	"github.com/labring/sealos/controllers/user/controllers/helper/ratelimiter"
)

func TestUserReconciler_reconcile(t *testing.T) {
	s := scheme.Scheme
	err := userv1.AddToScheme(s)
	require.NoError(t, err)

	user := &userv1.User{
		ObjectMeta: metav1.ObjectMeta{
			Name: "testuser",
			Annotations: map[string]string{
				userAnnotationOwnerKey: "owner",
			},
		},
		Spec: userv1.UserSpec{
			CSRExpirationSeconds: 3600,
		},
	}

	tests := []struct {
		name    string
		user    *userv1.User
		wantErr bool
	}{
		{
			name:    "normal reconcile",
			user:    user,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := fake.NewClientBuilder().WithScheme(s).WithObjects(tt.user).Build()
			r := &UserReconciler{
				Client:             client,
				Scheme:            s,
				config:            &rest.Config{},
				finalizer:         finalizer.NewFinalizer(client, "sealos.io/user.finalizers"),
				minRequeueDuration: time.Second,
				maxRequeueDuration: time.Second * 5,
			}

			result, err := r.reconcile(context.Background(), tt.user)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)
			assert.NotZero(t, result.RequeueAfter)
		})
	}
}

func TestUserReconciler_SetupWithManager(t *testing.T) {
	s := runtime.NewScheme()
	err := userv1.AddToScheme(s)
	require.NoError(t, err)

	client := fake.NewClientBuilder().WithScheme(s).Build()
	r := &UserReconciler{
		Client:    client,
		Scheme:    s,
		finalizer: finalizer.NewFinalizer(client, "sealos.io/user.finalizers"),
	}

	opts := ratelimiter.RateLimiterOptions{
		MaxConcurrentReconciles: 1,
	}

	err = r.SetupWithManager(nil, opts, time.Second, time.Second*5, time.Hour)
	assert.Error(t, err) // Should error with nil manager
}

func TestControllerRestartPredicate_Create(t *testing.T) {
	now := time.Now()
	tests := []struct {
		name       string
		checkTime  time.Time
		createTime time.Time
		want       bool
	}{
		{
			name:       "recent creation",
			checkTime:  now.Add(-time.Hour),
			createTime: now,
			want:       true,
		},
		{
			name:       "old creation",
			checkTime:  now,
			createTime: now.Add(-time.Hour),
			want:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := NewControllerRestartPredicate(time.Hour)
			p.checkTime = tt.checkTime

			obj := &v1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					CreationTimestamp: metav1.Time{Time: tt.createTime},
				},
			}

			got := p.Create(event.CreateEvent{Object: obj})
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestRandTimeDurationBetween(t *testing.T) {
	min := time.Second
	max := time.Second * 5

	tests := []struct {
		name string
		min  time.Duration
		max  time.Duration
	}{
		{
			name: "normal case",
			min:  min,
			max:  max,
		},
		{
			name: "min equals max",
			min:  min,
			max:  min,
		},
		{
			name: "min greater than max",
			min:  max,
			max:  min,
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

func TestUserReconciler_updateStatus(t *testing.T) {
	s := scheme.Scheme
	err := userv1.AddToScheme(s)
	require.NoError(t, err)

	user := &userv1.User{
		ObjectMeta: metav1.ObjectMeta{
			Name: "testuser",
		},
		Status: userv1.UserStatus{
			Phase: userv1.UserPending,
		},
	}

	tests := []struct {
		name    string
		user    *userv1.User
		status  *userv1.UserStatus
		wantErr bool
	}{
		{
			name: "update status",
			user: user,
			status: &userv1.UserStatus{
				Phase: userv1.UserActive,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := fake.NewClientBuilder().WithScheme(s).WithObjects(tt.user).Build()
			r := &UserReconciler{
				Client: client,
				Scheme: s,
			}

			err := r.updateStatus(context.Background(), types.NamespacedName{Name: tt.user.Name}, tt.status)
			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			assert.NoError(t, err)

			updated := &userv1.User{}
			err = client.Get(context.Background(), client.ObjectKey{Name: tt.user.Name}, updated)
			require.NoError(t, err)
			assert.Equal(t, tt.status.Phase, updated.Status.Phase)
		})
	}
}
