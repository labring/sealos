package v1

import (
	"context"
	"testing"

	pkgtype "github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils/maps"
	admissionv1 "k8s.io/api/admission/v1"
	authenticationv1 "k8s.io/api/authentication/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

// stubClient wraps a fake client and overrides Get for Namespace objects
// to be compatible with the production code's {Name: ns, Namespace: ns} key pattern.
type stubClient struct {
	client.WithWatch
	nsMap  map[string]*corev1.Namespace
	scheme *runtime.Scheme
}

func (s *stubClient) Get(
	_ context.Context,
	key client.ObjectKey,
	obj client.Object,
	_ ...client.GetOption,
) error {
	if ns, ok := s.nsMap[key.Name]; ok {
		namespace, ok := obj.(*corev1.Namespace)
		if !ok {
			return apierrors.NewBadRequest("stubClient only supports Namespace objects")
		}
		ns.DeepCopyInto(namespace)
		return nil
	}
	return apierrors.NewNotFound(corev1.Resource("namespaces"), key.Name)
}

func (s *stubClient) List(_ context.Context, _ client.ObjectList, _ ...client.ListOption) error {
	return nil
}

func (s *stubClient) Scheme() *runtime.Scheme { return s.scheme }

func newDebtWithNS(namespaces ...*corev1.Namespace) *DebtValidate {
	nsMap := make(map[string]*corev1.Namespace)
	objs := make([]client.Object, len(namespaces))
	for i, ns := range namespaces {
		nsMap[ns.Name] = ns
		objs[i] = ns
	}
	fc := fake.NewClientBuilder().WithObjects(objs...).Build()
	return &DebtValidate{
		Client:     &stubClient{WithWatch: fc, nsMap: nsMap, scheme: fc.Scheme()},
		AccountV2:  nil,
		TTLUserMap: maps.New[*pkgtype.UsableBalanceWithCredits](600),
	}
}

func makeReq(op admissionv1.Operation, kind, group, version, resource string) admission.Request {
	return admission.Request{
		AdmissionRequest: admissionv1.AdmissionRequest{
			Operation: op,
			Kind:      metav1.GroupVersionKind{Kind: kind, Group: group, Version: version},
			Resource: metav1.GroupVersionResource{
				Resource: resource,
				Group:    group,
				Version:  version,
			},
			UserInfo: authenticationv1.UserInfo{
				Username: "test-user",
				Groups:   []string{"system:serviceaccounts:user-system"},
			},
			Namespace: "ns-test",
			Name:      "test-resource",
		},
	}
}

func makeReqWithGroups(op admissionv1.Operation, groups []string) admission.Request {
	req := makeReq(op, "Pod", "", "v1", "pods")
	req.UserInfo = authenticationv1.UserInfo{
		Username: "test-user",
		Groups:   groups,
	}
	return req
}

// --- Identity bypass tests (no client/DB needed) ---

func TestHandle_SystemMastersBypass(t *testing.T) {
	d := &DebtValidate{}
	resp := d.Handle(
		context.Background(),
		makeReqWithGroups(admissionv1.Create, []string{"system:masters"}),
	)
	if !resp.Allowed {
		t.Fatalf("system:masters should be allowed, got: %s", resp.Result.Message)
	}
}

func TestHandle_KubeSystemBypass(t *testing.T) {
	d := &DebtValidate{}
	resp := d.Handle(
		context.Background(),
		makeReqWithGroups(admissionv1.Create, []string{"system:serviceaccounts:kube-system"}),
	)
	if !resp.Allowed {
		t.Fatalf("kube-system SA should be allowed, got: %s", resp.Result.Message)
	}
}

func TestHandle_NonUserSASkipped(t *testing.T) {
	d := &DebtValidate{}
	resp := d.Handle(
		context.Background(),
		makeReqWithGroups(admissionv1.Create, []string{"system:serviceaccounts:account-system"}),
	)
	if !resp.Allowed {
		t.Fatalf("non-user-system SA should be allowed, got: %s", resp.Result.Message)
	}
}

func TestHandle_UserControllerManagerBreaks(t *testing.T) {
	d := &DebtValidate{}
	req := makeReqWithGroups(admissionv1.Create, []string{"system:serviceaccounts:user-system"})
	req.UserInfo.Username = "system:serviceaccount:user-system:user-controller-manager"
	resp := d.Handle(context.Background(), req)
	if !resp.Allowed {
		t.Fatalf("user-controller-manager should be allowed, got: %s", resp.Result.Message)
	}
}

func TestHandle_UserSA_AdminBypass(t *testing.T) {
	d := &DebtValidate{}
	req := makeReqWithGroups(admissionv1.Create, []string{"system:serviceaccounts:user-system"})
	req.UserInfo.Username = "system:serviceaccount:user-system:admin"
	resp := d.Handle(context.Background(), req)
	if !resp.Allowed {
		t.Fatalf("ns-admin should be allowed, got: %s", resp.Result.Message)
	}
}

func TestHandle_WhitelistBypass(t *testing.T) {
	t.Setenv("WHITELIST", "terminals.Terminal.terminal.sealos.io/v1")

	d := &DebtValidate{}
	req := makeReq(admissionv1.Create, "Terminal", "terminal.sealos.io", "v1", "terminals")
	req.UserInfo = authenticationv1.UserInfo{
		Username: "test-user",
		Groups:   []string{"system:serviceaccounts:user-system"},
	}
	resp := d.Handle(context.Background(), req)
	if !resp.Allowed {
		t.Fatalf("whitelisted resource should be allowed, got: %s", resp.Result.Message)
	}
}

func TestHandle_WhitelistNoMatch_EntersCheck(t *testing.T) {
	t.Setenv("WHITELIST", "terminals.Terminal.terminal.sealos.io/v1")

	d := newDebtWithNS(&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "ns-test"}})
	req := makeReq(admissionv1.Create, "Pod", "", "v1", "pods")
	req.UserInfo = authenticationv1.UserInfo{
		Username: "test-user",
		Groups:   []string{"system:serviceaccounts:user-system"},
	}
	resp := d.Handle(context.Background(), req)
	if resp.Allowed {
		t.Fatal("non-whitelisted Pod from user SA without owner label namespace should be denied")
	}
}

func TestHandle_DeleteNonQuotaAllowed(t *testing.T) {
	d := &DebtValidate{}
	resp := d.Handle(context.Background(), makeReq(admissionv1.Delete, "Pod", "", "v1", "pods"))
	if !resp.Allowed {
		t.Fatalf("DELETE non-quota should be allowed, got: %s", resp.Result.Message)
	}
}

func TestHandle_DeleteQuotaNotBypassed(t *testing.T) {
	d := newDebtWithNS(&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "ns-test"}})
	req := makeReq(admissionv1.Delete, "ResourceQuota", "", "v1", "quotas")
	resp := d.Handle(context.Background(), req)
	if resp.Allowed {
		t.Fatal("DELETE quota from user SA without owner label should be denied")
	}
}

// --- Resource-type denial tests (no client/DB needed) ---

func TestHandle_NamespaceDenied(t *testing.T) {
	d := &DebtValidate{}
	req := makeReqWithGroups(admissionv1.Create, []string{"system:serviceaccounts:user-system"})
	req.Kind = metav1.GroupVersionKind{Kind: "Namespace", Version: "v1"}
	req.Resource = metav1.GroupVersionResource{Resource: "namespaces", Version: "v1"}
	if resp := d.Handle(context.Background(), req); resp.Allowed {
		t.Fatal("Namespace should be denied for user SA")
	}
}

func TestHandle_PaymentUpdateDenied(t *testing.T) {
	d := &DebtValidate{}
	req := makeReqWithGroups(admissionv1.Update, []string{"system:serviceaccounts:user-system"})
	req.Kind = metav1.GroupVersionKind{Kind: "Payment", Group: "account.sealos.io", Version: "v1"}
	req.Resource = metav1.GroupVersionResource{
		Resource: "payments",
		Group:    "account.sealos.io",
		Version:  "v1",
	}
	if resp := d.Handle(context.Background(), req); resp.Allowed {
		t.Fatal("Payment Update should be denied for user SA")
	}
}

func TestHandle_ResourceQuota_Denied(t *testing.T) {
	d := &DebtValidate{}
	req := makeReqWithGroups(admissionv1.Create, []string{"system:serviceaccounts:user-system"})
	req.Kind = metav1.GroupVersionKind{Kind: "ResourceQuota", Version: "v1"}
	req.Resource = metav1.GroupVersionResource{Resource: "resourcequotas", Version: "v1"}
	req.Name = "quota-default"
	if resp := d.Handle(context.Background(), req); resp.Allowed {
		t.Fatal("ResourceQuota with quota-xxx name should be denied for user SA")
	}
}

func TestHandle_DebtLimit0Quota_Denied(t *testing.T) {
	d := &DebtValidate{}
	req := makeReqWithGroups(admissionv1.Create, []string{"system:serviceaccounts:user-system"})
	req.Kind = metav1.GroupVersionKind{Kind: "ResourceQuota", Version: "v1"}
	req.Resource = metav1.GroupVersionResource{Resource: "resourcequotas", Version: "v1"}
	req.Name = debtLimit0QuotaName
	if resp := d.Handle(context.Background(), req); resp.Allowed {
		t.Fatal("debt-limit0 ResourceQuota should be denied for user SA")
	}
}

// --- API version coverage: verifies handler treats v1alpha1 same as v1 ---

func TestHandle_V1Alpha1OpsRequest_EntersDebtCheck(t *testing.T) {
	d := newDebtWithNS(&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "ns-test"}})
	req := makeReq(
		admissionv1.Create,
		"OpsRequest",
		"apps.kubeblocks.io",
		"v1alpha1",
		"opsrequests",
	)
	if resp := d.Handle(context.Background(), req); resp.Allowed {
		t.Fatal("v1alpha1 OpsRequest from user SA without owner label namespace should be denied")
	}
}

func TestHandle_V1Pod_EntersDebtCheck(t *testing.T) {
	d := newDebtWithNS(&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "ns-test"}})
	req := makeReq(admissionv1.Create, "Pod", "", "v1", "pods")
	if resp := d.Handle(context.Background(), req); resp.Allowed {
		t.Fatal("v1 Pod from user SA without owner label namespace should be denied")
	}
}

func TestHandle_V1Beta1Deployment_EntersDebtCheck(t *testing.T) {
	d := newDebtWithNS(&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "ns-test"}})
	req := makeReq(admissionv1.Create, "Deployment", "apps", "v1beta1", "deployments")
	if resp := d.Handle(context.Background(), req); resp.Allowed {
		t.Fatal("v1beta1 Deployment from user SA without owner label namespace should be denied")
	}
}

// --- checkOption ---

func TestCheckOption_EmptyNamespace(t *testing.T) {
	d := &DebtValidate{}
	if resp := d.checkOption(context.Background(), logger, nil, ""); !resp.Allowed {
		t.Fatal("empty namespace should be allowed")
	}
}

func TestCheckOption_NonUserNamespace_Denied(t *testing.T) {
	d := newDebtWithNS(&corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: "ns-test"}})
	if resp := d.checkOption(context.Background(), logger, d.Client, "ns-test"); resp.Allowed {
		t.Fatal("namespace without owner label should be denied")
	}
}

func TestCheckOption_CacheHit_InsufficientBalance(t *testing.T) {
	d := newDebtWithNS(&corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:   "ns-test",
			Labels: map[string]string{"user.sealos.io/owner": "user-1"},
		},
	})
	d.TTLUserMap.Put("account:user-1", &pkgtype.UsableBalanceWithCredits{
		Balance:          0,
		UsableCredits:    0,
		DeductionBalance: 100,
	})
	if resp := d.checkOption(context.Background(), logger, d.Client, "ns-test"); resp.Allowed {
		t.Fatal("insufficient balance from cache should be denied")
	}
}

func TestCheckOption_CacheHit_SufficientBalance(t *testing.T) {
	d := newDebtWithNS(&corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:   "ns-test",
			Labels: map[string]string{"user.sealos.io/owner": "user-1"},
		},
	})
	d.TTLUserMap.Put("account:user-1", &pkgtype.UsableBalanceWithCredits{
		Balance:          100,
		UsableCredits:    0,
		DeductionBalance: 0,
	})
	if resp := d.checkOption(context.Background(), logger, d.Client, "ns-test"); !resp.Allowed {
		t.Fatalf("sufficient balance from cache should be allowed, got: %s", resp.Result.Message)
	}
}

// --- Helpers ---

func TestIsDefaultQuotaName(t *testing.T) {
	tests := []struct {
		name     string
		expected bool
	}{
		{"quota-default", true},
		{"quota-", true},
		{"debt-limit0", true},
		{"my-quota", false},
		{"default", false},
		{"", false},
	}
	for _, tt := range tests {
		if got := isDefaultQuotaName(tt.name); got != tt.expected {
			t.Errorf("isDefaultQuotaName(%q) = %v, want %v", tt.name, got, tt.expected)
		}
	}
}

func TestGetGVRK(t *testing.T) {
	reqWithGroup := makeReq(admissionv1.Create, "Pod", "apps", "v1", "deployments")
	if got := getGVRK(reqWithGroup); got != "deployments.Pod.apps/v1" {
		t.Errorf("getGVRK with group = %q, want deployments.Pod.apps/v1", got)
	}
	reqWithoutGroup := makeReq(admissionv1.Create, "Pod", "", "v1", "pods")
	if got := getGVRK(reqWithoutGroup); got != "pods.Pod/v1" {
		t.Errorf("getGVRK without group = %q, want pods.Pod/v1", got)
	}
}
