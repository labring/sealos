package controllers

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper/finalizer"
)

type mockClient struct {
	mock.Mock
	client.Client
}

func (m *mockClient) Get(ctx context.Context, key client.ObjectKey, obj client.Object) error {
	args := m.Called(ctx, key, obj)
	return args.Error(0)
}

func (m *mockClient) Update(ctx context.Context, obj client.Object, opts ...client.UpdateOption) error {
	args := m.Called(ctx, obj, opts)
	return args.Error(0)
}

func TestUserExpirationReconciler_Reconcile(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = userv1.AddToScheme(scheme)

	tests := []struct {
		name           string
		existingUser   *userv1.User
		expectedResult ctrl.Result
		expectedError  error
	}{
		{
			name:           "User not found",
			existingUser:   nil,
			expectedResult: ctrl.Result{},
			expectedError:  nil,
		},
		{
			name: "User exists without finalizer",
			existingUser: &userv1.User{
				ObjectMeta: ctrl.ObjectMeta{
					Name:      "test-user",
					Namespace: "default",
				},
			},
			expectedResult: ctrl.Result{},
			expectedError:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := fake.NewClientBuilder().WithScheme(scheme).WithObjects().Build()
			if tt.existingUser != nil {
				err := client.Create(context.Background(), tt.existingUser)
				assert.NoError(t, err)
			}

			r := &UserExpirationReconciler{
				Client:    client,
				Scheme:    scheme,
				Logger:    zap.New(),
				Recorder:  &record.FakeRecorder{},
				finalizer: finalizer.NewFinalizer(client, "sealos.io/user.expiration.finalizers"),
			}

			result, err := r.Reconcile(context.Background(), ctrl.Request{
				NamespacedName: client.ObjectKey{
					Name:      "test-user",
					Namespace: "default",
				},
			})

			if tt.expectedError != nil {
				assert.Error(t, err)
				assert.Equal(t, tt.expectedError, err)
			} else {
				assert.NoError(t, err)
			}
			assert.Equal(t, tt.expectedResult, result)
		})
	}
}

func TestUserExpirationReconciler_SetupWithManager(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = userv1.AddToScheme(scheme)

	mgr := &mockManager{
		scheme: scheme,
		client: fake.NewClientBuilder().WithScheme(scheme).Build(),
	}

	r := &UserExpirationReconciler{}
	err := r.SetupWithManager(mgr)
	assert.NoError(t, err)
	assert.NotNil(t, r.Client)
	assert.NotNil(t, r.Logger)
	assert.NotNil(t, r.Recorder)
	assert.NotNil(t, r.finalizer)
	assert.NotNil(t, r.Scheme)
	assert.NotNil(t, r.config)
}

type mockManager struct {
	scheme *runtime.Scheme
	client client.Client
}

func (m *mockManager) GetScheme() *runtime.Scheme {
	return m.scheme
}

func (m *mockManager) GetClient() client.Client {
	return m.client
}

func (m *mockManager) GetConfig() *rest.Config {
	return &rest.Config{}
}

func (m *mockManager) GetEventRecorderFor(name string) record.EventRecorder {
	return &record.FakeRecorder{}
}
