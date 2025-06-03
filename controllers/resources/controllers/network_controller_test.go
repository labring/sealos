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
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"
)

func TestNetworkReconciler_Reconcile(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	_ = networkingv1.AddToScheme(scheme)

	tests := []struct {
		name           string
		namespace     *corev1.Namespace
		ingress       *networkingv1.Ingress
		service       *corev1.Service
		expectedError bool
	}{
		{
			name: "Suspend namespace with ingress and service",
			namespace: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-ns",
					Annotations: map[string]string{
						NetworkStatusAnnoKey: NetworkSuspend,
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
			expectedError: false,
		},
		{
			name: "Resume namespace with suspended resources",
			namespace: &corev1.Namespace{
				ObjectMeta: metav1.ObjectMeta{
					Name: "test-ns",
					Annotations: map[string]string{
						NetworkStatusAnnoKey: NetworkResume,
					},
				},
			},
			ingress: &networkingv1.Ingress{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-ingress",
					Namespace: "test-ns",
					Annotations: map[string]string{
						IngressClassKey: Disable,
					},
				},
			},
			service: &corev1.Service{
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
			},
			expectedError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := fake.NewClientBuilder().
				WithScheme(scheme).
				WithObjects(tt.namespace, tt.ingress, tt.service).
				Build()

			r := &NetworkReconciler{
				Client: client,
				Log:    zap.New(),
			}

			req := ctrl.Request{
				NamespacedName: types.NamespacedName{
					Name: tt.namespace.Name,
				},
			}

			_, err := r.Reconcile(context.Background(), req)
			if tt.expectedError {
				require.Error(t, err)
			} else {
				require.NoError(t, err)
			}

			// Verify resources after reconciliation
			ns := &corev1.Namespace{}
			err = client.Get(context.Background(), types.NamespacedName{Name: tt.namespace.Name}, ns)
			require.NoError(t, err)

			switch ns.Annotations[NetworkStatusAnnoKey] {
			case NetworkSuspend:
				ing := &networkingv1.Ingress{}
				err = client.Get(context.Background(), types.NamespacedName{Name: tt.ingress.Name, Namespace: tt.namespace.Name}, ing)
				require.NoError(t, err)
				assert.Equal(t, Disable, ing.Annotations[IngressClassKey])

				svc := &corev1.Service{}
				err = client.Get(context.Background(), types.NamespacedName{Name: tt.service.Name, Namespace: tt.namespace.Name}, svc)
				require.NoError(t, err)
				assert.Equal(t, corev1.ServiceTypeClusterIP, svc.Spec.Type)
				assert.Equal(t, True, svc.Labels[NodePortLabelKey])

			case NetworkResume:
				assert.Equal(t, NetworkResumeCompleted, ns.Annotations[NetworkStatusAnnoKey])

				ing := &networkingv1.Ingress{}
				err = client.Get(context.Background(), types.NamespacedName{Name: tt.ingress.Name, Namespace: tt.namespace.Name}, ing)
				require.NoError(t, err)
				assert.Equal(t, "nginx", ing.Annotations[IngressClassKey])

				svc := &corev1.Service{}
				err = client.Get(context.Background(), types.NamespacedName{Name: tt.service.Name, Namespace: tt.namespace.Name}, svc)
				require.NoError(t, err)
				assert.Equal(t, corev1.ServiceTypeNodePort, svc.Spec.Type)
				_, exists := svc.Labels[NodePortLabelKey]
				assert.False(t, exists)
			}
		})
	}
}

func TestNetworkAnnotationPredicate(t *testing.T) {
	pred := NetworkAnnotationPredicate{}

	t.Run("Create event", func(t *testing.T) {
		ns := &corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Annotations: map[string]string{
					NetworkStatusAnnoKey: NetworkSuspend,
				},
			},
		}
		evt := &metav1.CreateEvent{
			Object: ns,
		}
		assert.True(t, pred.Create(*evt))

		ns.Annotations[NetworkStatusAnnoKey] = NetworkResumeCompleted
		assert.False(t, pred.Create(*evt))
	})

	t.Run("Update event", func(t *testing.T) {
		oldNs := &corev1.Namespace{
			ObjectMeta: metav1.ObjectMeta{
				Annotations: map[string]string{
					NetworkStatusAnnoKey: NetworkSuspend,
				},
			},
		}
		newNs := oldNs.DeepCopy()
		newNs.Annotations[NetworkStatusAnnoKey] = NetworkResume

		evt := &metav1.UpdateEvent{
			ObjectOld: oldNs,
			ObjectNew: newNs,
		}
		assert.True(t, pred.Update(*evt))

		newNs.Annotations[NetworkStatusAnnoKey] = NetworkResumeCompleted
		assert.False(t, pred.Update(*evt))
	})
}
