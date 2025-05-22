package controllers

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestNetworkReconciler_Reconcile(t *testing.T) {
	// Setup test scheme
	s := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(s))
	require.NoError(t, networkingv1.AddToScheme(s))

	tests := []struct {
		name            string
		namespace       *corev1.Namespace
		ingress        *networkingv1.Ingress
		service        *corev1.Service
		expectedResult ctrl.Result
		expectedError  bool
	}{
		{
			name: "Namespace with suspend status",
			namespace: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-ns",
					Annotations: map[string]string{
						NetworkStatusAnnoKey: NetworkSuspended,
					},
				},
			},
			ingress: &networkingv1.Ingress{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-ingress",
					Namespace: "test-ns",
				},
			},
			service: &corev1.Service{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-service",
					Namespace: "test-ns",
				},
				Spec: corev1.ServiceSpec{
					Type: corev1.ServiceTypeNodePort,
				},
			},
			expectedResult: ctrl.Result{},
			expectedError:  false,
		},
		{
			name: "Namespace with resume status",
			namespace: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-ns",
					Annotations: map[string]string{
						NetworkStatusAnnoKey: NetworkResume,
					},
				},
			},
			expectedResult: ctrl.Result{},
			expectedError:  false,
		},
		{
			name: "Namespace with completed status",
			namespace: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-ns",
					Annotations: map[string]string{
						NetworkStatusAnnoKey: NetworkResumeCompleted,
					},
				},
			},
			expectedResult: ctrl.Result{},
			expectedError:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create fake client
			client := fake.NewClientBuilder().WithScheme(s).WithObjects(tt.namespace).Build()
			if tt.ingress != nil {
				require.NoError(t, client.Create(context.Background(), tt.ingress))
			}
			if tt.service != nil {
				require.NoError(t, client.Create(context.Background(), tt.service))
			}

			r := &NetworkReconciler{
				Client: client,
				Log:    ctrl.Log.WithName("test"),
			}

			result, err := r.Reconcile(context.Background(), ctrl.Request{
				NamespacedName: types.NamespacedName{
					Name: tt.namespace.Name,
				},
			})

			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
			assert.Equal(t, tt.expectedResult, result)
		})
	}
}

func TestNetworkReconciler_suspendNetworkResources(t *testing.T) {
	s := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(s))
	require.NoError(t, networkingv1.AddToScheme(s))

	ingress := &networkingv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-ingress",
			Namespace: "test-ns",
		},
	}

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-service",
			Namespace: "test-ns",
		},
		Spec: corev1.ServiceSpec{
			Type: corev1.ServiceTypeNodePort,
		},
	}

	client := fake.NewClientBuilder().WithScheme(s).WithObjects(ingress, service).Build()

	r := &NetworkReconciler{
		Client: client,
		Log:    ctrl.Log.WithName("test"),
	}

	err := r.suspendNetworkResources(context.Background(), "test-ns")
	require.NoError(t, err)

	// Verify ingress was updated
	updatedIngress := &networkingv1.Ingress{}
	err = client.Get(context.Background(), types.NamespacedName{Name: "test-ingress", Namespace: "test-ns"}, updatedIngress)
	require.NoError(t, err)
	assert.Equal(t, Disable, updatedIngress.Annotations[IngressClassKey])

	// Verify service was updated
	updatedService := &corev1.Service{}
	err = client.Get(context.Background(), types.NamespacedName{Name: "test-service", Namespace: "test-ns"}, updatedService)
	require.NoError(t, err)
	assert.Equal(t, corev1.ServiceTypeClusterIP, updatedService.Spec.Type)
	assert.Equal(t, True, updatedService.Labels[NodePortLabelKey])
}

func TestNetworkReconciler_resumeNetworkResources(t *testing.T) {
	s := runtime.NewScheme()
	require.NoError(t, corev1.AddToScheme(s))
	require.NoError(t, networkingv1.AddToScheme(s))

	ingress := &networkingv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-ingress",
			Namespace: "test-ns",
			Annotations: map[string]string{
				IngressClassKey: Disable,
			},
		},
	}

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-service",
			Namespace: "test-ns",
			Labels: map[string]string{
				NodePortLabelKey: True,
			},
		},
		Spec: corev1.ServiceSpec{
			Type: corev1.ServiceTypeClusterIP,
		},
	}

	client := fake.NewClientBuilder().WithScheme(s).WithObjects(ingress, service).Build()

	r := &NetworkReconciler{
		Client: client,
		Log:    ctrl.Log.WithName("test"),
	}

	err := r.resumeNetworkResources(context.Background(), "test-ns")
	require.NoError(t, err)

	// Verify ingress was updated
	updatedIngress := &networkingv1.Ingress{}
	err = client.Get(context.Background(), types.NamespacedName{Name: "test-ingress", Namespace: "test-ns"}, updatedIngress)
	require.NoError(t, err)
	assert.Equal(t, "nginx", updatedIngress.Annotations[IngressClassKey])

	// Verify service was updated
	updatedService := &corev1.Service{}
	err = client.Get(context.Background(), types.NamespacedName{Name: "test-service", Namespace: "test-ns"}, updatedService)
	require.NoError(t, err)
	assert.Equal(t, corev1.ServiceTypeNodePort, updatedService.Spec.Type)
	_, exists := updatedService.Labels[NodePortLabelKey]
	assert.False(t, exists)
}

func TestNetworkAnnotationPredicate(t *testing.T) {
	pred := NetworkAnnotationPredicate{}

	t.Run("Create", func(t *testing.T) {
		ns := &corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Annotations: map[string]string{
					NetworkStatusAnnoKey: NetworkSuspended,
				},
			},
		}
		assert.True(t, pred.Create(event.CreateEvent{Object: ns}))

		ns.Annotations[NetworkStatusAnnoKey] = NetworkResumeCompleted
		assert.False(t, pred.Create(event.CreateEvent{Object: ns}))
	})

	t.Run("Update", func(t *testing.T) {
		oldNs := &corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Annotations: map[string]string{
					NetworkStatusAnnoKey: NetworkSuspended,
				},
			},
		}
		newNs := &corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Annotations: map[string]string{
					NetworkStatusAnnoKey: NetworkResume,
				},
			},
		}
		assert.True(t, pred.Update(event.UpdateEvent{ObjectOld: oldNs, ObjectNew: newNs}))

		newNs.Annotations[NetworkStatusAnnoKey] = NetworkResumeCompleted
		assert.False(t, pred.Update(event.UpdateEvent{ObjectOld: oldNs, ObjectNew: newNs}))
	})
}
