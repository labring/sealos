package controllers

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/log"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	"github.com/labring/sealos/controllers/user/controllers/helper/ratelimiter"
)

func TestOperationReqReconciler_SetupWithManager(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = userv1.AddToScheme(scheme)
	_ = scheme.AddKnownTypes(userv1.GroupVersion, &userv1.Operationrequest{})

	mgr := &mockManager{
		scheme: scheme,
	}

	r := &OperationReqReconciler{}
	err := r.SetupWithManager(mgr, ratelimiter.RateLimiterOptions{}, 1*time.Hour, 1*time.Hour)
	require.NoError(t, err)
}

func TestOperationReqReconciler_Reconcile(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = userv1.AddToScheme(scheme)
	_ = scheme.AddKnownTypes(userv1.GroupVersion, &userv1.Operationrequest{})
	_ = scheme.AddKnownTypes(userv1.GroupVersion, &userv1.User{})
	_ = rbacv1.AddToScheme(scheme)

	tests := []struct {
		name           string
		request        *userv1.Operationrequest
		user          *userv1.User
		bindUser      *userv1.User
		expectedError bool
		expectedPhase userv1.RequestPhase
	}{
		{
			name: "successful grant request",
			request: &userv1.Operationrequest{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-request",
					Namespace: config.GetUserSystemNamespace(),
					CreationTimestamp: metav1.Time{
						Time: time.Now(),
					},
				},
				Spec: userv1.OperationrequestSpec{
					User:      "test-user",
					Namespace: "test-ns",
					Role:      userv1.EditRoleType,
					Action:    userv1.Grant,
				},
			},
			user: &userv1.User{
				ObjectMeta: metav1.ObjectMeta{
					Name:        "test-ns",
					Annotations: map[string]string{},
				},
			},
			bindUser: &userv1.User{
				ObjectMeta: metav1.ObjectMeta{
					Name:        "test-user",
					Annotations: map[string]string{},
				},
			},
			expectedError: false,
			expectedPhase: userv1.RequestCompleted,
		},
		{
			name: "expired request",
			request: &userv1.Operationrequest{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "expired-request",
					Namespace: config.GetUserSystemNamespace(),
					CreationTimestamp: metav1.Time{
						Time: time.Now().Add(-2 * time.Hour),
					},
				},
				Spec: userv1.OperationrequestSpec{
					User:      "test-user",
					Namespace: "test-ns",
					Role:      userv1.EditRoleType,
					Action:    userv1.Grant,
				},
			},
			user: &userv1.User{
				ObjectMeta: metav1.ObjectMeta{
					Name:        "test-ns",
					Annotations: map[string]string{},
				},
			},
			bindUser: &userv1.User{
				ObjectMeta: metav1.ObjectMeta{
					Name:        "test-user",
					Annotations: map[string]string{},
				},
			},
			expectedError: false,
			expectedPhase: userv1.RequestFailed,
		},
		{
			name: "deprive request",
			request: &userv1.Operationrequest{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "deprive-request",
					Namespace: config.GetUserSystemNamespace(),
					CreationTimestamp: metav1.Time{
						Time: time.Now(),
					},
				},
				Spec: userv1.OperationrequestSpec{
					User:      "test-user",
					Namespace: "test-ns",
					Role:      userv1.EditRoleType,
					Action:    userv1.Deprive,
				},
			},
			user: &userv1.User{
				ObjectMeta: metav1.ObjectMeta{
					Name:        "test-ns",
					Annotations: map[string]string{},
				},
			},
			bindUser: &userv1.User{
				ObjectMeta: metav1.ObjectMeta{
					Name:        "test-user",
					Annotations: map[string]string{},
				},
			},
			expectedError: false,
			expectedPhase: userv1.RequestCompleted,
		},
		{
			name: "update owner role request",
			request: &userv1.Operationrequest{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "update-owner-request",
					Namespace: config.GetUserSystemNamespace(),
					CreationTimestamp: metav1.Time{
						Time: time.Now(),
					},
				},
				Spec: userv1.OperationrequestSpec{
					User:      "test-user",
					Namespace: "test-ns",
					Role:      userv1.OwnerRoleType,
					Action:    userv1.Update,
				},
			},
			user: &userv1.User{
				ObjectMeta: metav1.ObjectMeta{
					Name:        "test-ns",
					Annotations: map[string]string{},
				},
			},
			bindUser: &userv1.User{
				ObjectMeta: metav1.ObjectMeta{
					Name:        "test-user",
					Annotations: map[string]string{},
				},
			},
			expectedError: false,
			expectedPhase: userv1.RequestCompleted,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := fake.NewClientBuilder().WithScheme(scheme).WithObjects(tt.request, tt.user, tt.bindUser).Build()

			r := &OperationReqReconciler{
				Client:         client,
				Scheme:        scheme,
				Recorder:      record.NewFakeRecorder(100),
				userLock:      make(map[string]*sync.Mutex),
				Logger:        log.Log.WithName("test"),
				expirationTime: 1 * time.Hour,
				retentionTime:  1 * time.Hour,
			}

			_, err := r.Reconcile(context.Background(), ctrl.Request{
				NamespacedName: client.ObjectKey{
					Name:      tt.request.Name,
					Namespace: tt.request.Namespace,
				},
			})

			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)

				updatedRequest := &userv1.Operationrequest{}
				err = client.Get(context.Background(), client.ObjectKey{
					Name:      tt.request.Name,
					Namespace: tt.request.Namespace,
				}, updatedRequest)
				require.NoError(t, err)
				assert.Equal(t, tt.expectedPhase, updatedRequest.Status.Phase)
			}
		})
	}
}

type mockManager struct {
	scheme *runtime.Scheme
}

func (m *mockManager) Add(runnable manager.Runnable) error {
	return nil
}

func (m *mockManager) SetFields(interface{}) error {
	return nil
}

func (m *mockManager) Start(ctx context.Context) error {
	return nil
}

func (m *mockManager) GetConfig() *rest.Config {
	return nil
}

func (m *mockManager) GetScheme() *runtime.Scheme {
	return m.scheme
}

func (m *mockManager) GetClient() client.Client {
	return nil
}

func (m *mockManager) GetFieldIndexer() client.FieldIndexer {
	return nil
}

func (m *mockManager) GetCache() cache.Cache {
	return nil
}

func (m *mockManager) GetEventRecorderFor(name string) record.EventRecorder {
	return nil
}

func (m *mockManager) GetRESTMapper() meta.RESTMapper {
	return nil
}

func (m *mockManager) GetAPIReader() client.Reader {
	return nil
}

func (m *mockManager) GetWebhookServer() *webhook.Server {
	return nil
}

func (m *mockManager) GetLogger() logr.Logger {
	return logr.Logger{}
}
