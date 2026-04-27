package v1

import (
	"context"
	"testing"

	admissionv1 "k8s.io/api/admission/v1"
	authenticationv1 "k8s.io/api/authentication/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	clientfake "sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

func TestIsKBStartOpsRequest(t *testing.T) {
	tests := []struct {
		name string
		req  admission.Request
		want bool
	}{
		{
			name: "start opsrequest",
			req:  newOpsRequestAdmission("apps.kubeblocks.io", "Start", admissionv1.Create, nil),
			want: true,
		},
		{
			name: "stop opsrequest",
			req:  newOpsRequestAdmission("apps.kubeblocks.io", "Stop", admissionv1.Create, nil),
			want: false,
		},
		{
			name: "wrong group",
			req:  newOpsRequestAdmission("operations.kubeblocks.io", "Start", admissionv1.Create, nil),
			want: false,
		},
		{
			name: "update request",
			req:  newOpsRequestAdmission("apps.kubeblocks.io", "Start", admissionv1.Update, nil),
			want: false,
		},
		{
			name: "malformed payload",
			req: admission.Request{
				AdmissionRequest: admissionv1.AdmissionRequest{
					Kind: metav1.GroupVersionKind{
						Group:   "apps.kubeblocks.io",
						Version: "v1alpha1",
						Kind:    "OpsRequest",
					},
					Resource: metav1.GroupVersionResource{
						Group:    "apps.kubeblocks.io",
						Version:  "v1alpha1",
						Resource: "opsrequests",
					},
					Operation: admissionv1.Create,
					Object:    runtime.RawExtension{Raw: []byte("{invalid")},
				},
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isKBStartOpsRequest(tt.req); got != tt.want {
				t.Fatalf("isKBStartOpsRequest() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestHasDebtLimit0Quota(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := clientgoscheme.AddToScheme(scheme); err != nil {
		t.Fatalf("failed to add client-go scheme: %v", err)
	}

	tests := []struct {
		name    string
		objects []runtime.Object
		want    bool
	}{
		{
			name: "quota exists",
			objects: []runtime.Object{
				&corev1.ResourceQuota{
					ObjectMeta: metav1.ObjectMeta{
						Name:      debtLimit0QuotaName,
						Namespace: "test-ns",
					},
				},
			},
			want: true,
		},
		{
			name:    "quota missing",
			objects: nil,
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			validator := &DebtValidate{
				Client: clientfake.NewClientBuilder().WithScheme(scheme).WithRuntimeObjects(tt.objects...).Build(),
			}
			if got := validator.hasDebtLimit0Quota(context.Background(), "test-ns"); got != tt.want {
				t.Fatalf("hasDebtLimit0Quota() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestHandleKubeBlocksStartDebtGuard(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := clientgoscheme.AddToScheme(scheme); err != nil {
		t.Fatalf("failed to add client-go scheme: %v", err)
	}

	quota := &corev1.ResourceQuota{
		ObjectMeta: metav1.ObjectMeta{
			Name:      debtLimit0QuotaName,
			Namespace: "test-ns",
		},
	}
	validator := &DebtValidate{
		Client: clientfake.NewClientBuilder().WithScheme(scheme).WithRuntimeObjects(quota).Build(),
	}

	t.Run("deny normal caller", func(t *testing.T) {
		req := newOpsRequestAdmission("apps.kubeblocks.io", "Start", admissionv1.Create, []string{"system:serviceaccounts:user-system"})
		resp, handled := validator.handleKubeBlocksStartDebtGuard(context.Background(), req)
		if !handled {
			t.Fatal("expected guard to handle request")
		}
		if resp.Allowed {
			t.Fatal("expected start opsrequest to be denied")
		}
	})

	t.Run("bypass masters", func(t *testing.T) {
		req := newOpsRequestAdmission("apps.kubeblocks.io", "Start", admissionv1.Create, []string{mastersGroup})
		_, handled := validator.handleKubeBlocksStartDebtGuard(context.Background(), req)
		if handled {
			t.Fatal("expected privileged caller to bypass guard")
		}
	})
}

func newOpsRequestAdmission(
	group string,
	opsType string,
	operation admissionv1.Operation,
	groups []string,
) admission.Request {
	raw := []byte(`{"apiVersion":"` + group + `/v1alpha1","kind":"OpsRequest","spec":{"type":"` + opsType + `"}}`)
	return admission.Request{
		AdmissionRequest: admissionv1.AdmissionRequest{
			Kind: metav1.GroupVersionKind{
				Group:   group,
				Version: "v1alpha1",
				Kind:    "OpsRequest",
			},
			Resource: metav1.GroupVersionResource{
				Group:    group,
				Version:  "v1alpha1",
				Resource: "opsrequests",
			},
			Namespace: "test-ns",
			Operation: operation,
			Object: runtime.RawExtension{
				Raw: raw,
			},
			UserInfo: authenticationv1.UserInfo{
				Username: "system:serviceaccount:user-system:test",
				Groups:   groups,
			},
		},
	}
}
