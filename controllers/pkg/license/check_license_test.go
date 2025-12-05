package license

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestCheckLicenseScenarios(t *testing.T) {
	ctx := context.Background()

	t.Run("no license", func(t *testing.T) {
		cli := newTestClient(t)
		ok, err := CheckLicense(ctx, cli)
		require.ErrorIs(t, err, ErrLicenseNotFound)
		require.False(t, ok)
	})

	t.Run("expired license", func(t *testing.T) {
		expired := newLicenseUnstructured("default", "Expired", "expired")
		cli := newTestClient(t, expired)
		res, err := Evaluate(ctx, cli)
		require.ErrorIs(t, err, ErrNoValidLicense)
		require.False(t, res.Valid)
		require.Contains(t, res.Reason, "expired")
	})

	t.Run("valid license", func(t *testing.T) {
		valid := newLicenseUnstructured("enterprise", "Active", "ok")
		cli := newTestClient(t, valid)
		res, err := Evaluate(ctx, cli)
		require.NoError(t, err)
		require.True(t, res.Valid)
		require.Equal(t, "enterprise", res.License.Name)
	})
}

func TestLicenseChecker_Check(t *testing.T) {
	t.Run("valid license", func(t *testing.T) {
		cli := newTestClient(t, newLicenseUnstructured("default", "Active", ""))
		checker := NewLicenseChecker(cli).Checker()
		require.NoError(t, checker(nil))
	})

	t.Run("invalid license", func(t *testing.T) {
		cli := newTestClient(t, newLicenseUnstructured("default", "Expired", "expired"))
		checker := NewLicenseChecker(cli).Checker()
		require.Error(t, checker(nil))
	})
}

func newTestClient(t *testing.T, objs ...client.Object) client.Client {
	t.Helper()
	scheme := runtime.NewScheme()
	scheme.AddKnownTypeWithName(
		schema.GroupVersionKind{
			Group:   licenseGroup,
			Version: licenseVersion,
			Kind:    licenseKind,
		},
		&unstructured.Unstructured{},
	)
	scheme.AddKnownTypeWithName(
		schema.GroupVersionKind{
			Group:   licenseGroup,
			Version: licenseVersion,
			Kind:    licenseListKind,
		},
		&unstructured.UnstructuredList{},
	)
	return fake.NewClientBuilder().WithScheme(scheme).WithObjects(objs...).Build()
}

func newLicenseUnstructured(name, phase, reason string) *unstructured.Unstructured {
	obj := newLicenseObject()
	obj.SetNamespace(DefaultLicense.Namespace)
	obj.SetName(name)
	status := map[string]any{}
	if phase != "" {
		status["phase"] = phase
	}
	if reason != "" {
		status["reason"] = reason
	}
	if len(status) > 0 {
		obj.Object["status"] = status
	}
	return obj
}
