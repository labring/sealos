// Copyright © 2026 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package standalone

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/kubernetes/fake"
	"k8s.io/client-go/rest"
	clienttesting "k8s.io/client-go/testing"
	"k8s.io/client-go/tools/clientcmd"
)

func TestControllerKubeconfigDoesNotCopyAdministratorCredentials(t *testing.T) {
	config := &rest.Config{
		Host:        "https://127.0.0.1:6443",
		BearerToken: "administrator-token",
		Username:    "administrator",
		Password:    "administrator-password",
		TLSClientConfig: rest.TLSClientConfig{
			CAData:   []byte("cluster-ca"),
			CertData: []byte("administrator-certificate"),
			KeyData:  []byte("administrator-key"),
		},
	}
	data, err := controllerKubeconfig(config, []byte("controller-token"))
	if err != nil {
		t.Fatal(err)
	}
	loaded, err := clientcmd.RESTConfigFromKubeConfig(data)
	if err != nil {
		t.Fatal(err)
	}
	if loaded.BearerToken != "controller-token" || loaded.Host != config.Host ||
		string(loaded.CAData) != "cluster-ca" || len(loaded.CertData) != 0 ||
		len(loaded.KeyData) != 0 || loaded.Username != "" || loaded.Password != "" {
		t.Fatal("generated kubeconfig contains unintended authentication settings")
	}
	config.Insecure = true
	if _, err := controllerKubeconfig(config, []byte("controller-token")); err == nil {
		t.Fatal("accepted an untrusted API connection")
	}
}

func TestControllerPermissionsAreReadOnlyAndScoped(t *testing.T) {
	for _, item := range controllerIdentityResources() {
		var rules []rbacv1.PolicyRule
		switch object := item.object.(type) {
		case *rbacv1.ClusterRole:
			rules = object.Rules
			for _, rule := range rules {
				for _, resource := range rule.Resources {
					if resource != "nodes" && resource != "ciliumnodes" {
						t.Fatalf("unexpected cluster-wide access to %s", resource)
					}
				}
			}
		case *rbacv1.Role:
			if object.Namespace != "kube-system" {
				t.Fatal("controller permissions escaped kube-system")
			}
			rules = object.Rules
			for _, rule := range rules {
				for _, resource := range rule.Resources {
					if resource != "pods" && resource != "configmaps" {
						t.Fatalf("unexpected namespaced access to %s", resource)
					}
					if resource == "configmaps" && len(rule.ResourceNames) == 0 {
						t.Fatal("unrestricted ConfigMap access")
					}
				}
			}
		}
		for _, rule := range rules {
			for _, verb := range rule.Verbs {
				if verb != "get" && verb != "list" && verb != "watch" {
					t.Fatalf("unexpected controller permission: %s", verb)
				}
			}
		}
	}
}

func TestControllerIdentityDoesNotAdoptUnmanagedResources(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	client := dynamicfake.NewSimpleDynamicClient(scheme, &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{Name: controllerIdentity, Namespace: "kube-system"},
	})
	if err := ensureControllerIdentity(context.Background(), client); err == nil {
		t.Fatal("adopted an administrator-owned ServiceAccount")
	}
	for _, action := range client.Actions() {
		if action.GetVerb() != "get" {
			t.Fatal("modified an unmanaged identity")
		}
	}
}

func TestControllerTokenOwnershipAndIssuance(t *testing.T) {
	for _, scenario := range []string{"existing", "create", "unmanaged", "wrong-account", "wrong-uid", "pending"} {
		t.Run(scenario, func(t *testing.T) {
			account := &corev1.ServiceAccount{
				ObjectMeta: metav1.ObjectMeta{
					Name: controllerIdentity, Namespace: "kube-system", UID: "account-uid",
				},
			}
			secret := &corev1.Secret{
				ObjectMeta: metav1.ObjectMeta{
					Name: controllerIdentity, Namespace: "kube-system",
					Labels: map[string]string{controllerOwnerLabel: "managed"},
					Annotations: map[string]string{
						corev1.ServiceAccountNameKey: controllerIdentity,
						corev1.ServiceAccountUIDKey:  string(account.UID),
					},
				},
				Type: corev1.SecretTypeServiceAccountToken,
				Data: map[string][]byte{corev1.ServiceAccountTokenKey: []byte("issued-token")},
			}
			switch scenario {
			case "unmanaged":
				secret.Labels = nil
			case "wrong-account":
				secret.Annotations[corev1.ServiceAccountNameKey] = "other-account"
			case "wrong-uid":
				secret.Annotations[corev1.ServiceAccountUIDKey] = "replaced-account"
			case "pending":
				secret.Data = nil
			}
			client := fake.NewSimpleClientset(account)
			if scenario == "create" {
				client.PrependReactor(
					"create",
					"secrets",
					func(action clienttesting.Action) (bool, runtime.Object, error) {
						create, ok := action.(clienttesting.CreateAction)
						if !ok {
							t.Fatal("unexpected Secret action")
						}
						created, ok := create.GetObject().(*corev1.Secret)
						if !ok {
							t.Fatal("unexpected Secret object")
						}
						if len(created.Data) != 0 {
							t.Fatal("client attempted to supply its own ServiceAccount token")
						}
						created.Data = secret.Data
						return false, nil, nil
					},
				)
			} else if err := client.Tracker().Add(secret); err != nil {
				t.Fatal(err)
			}
			ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
			defer cancel()
			token, err := controllerToken(ctx, client)
			wantSuccess := scenario == "existing" || scenario == "create"
			if (err == nil) != wantSuccess {
				t.Fatalf("unexpected token result: %v", err)
			}
			if wantSuccess && string(token) != "issued-token" {
				t.Fatal("did not use the token issued by Kubernetes")
			}
		})
	}
}

func TestControllerPreflightAllowsOnlyManagedCredentialsToBeMissing(t *testing.T) {
	options := DefaultRouteControllerOptions()
	manifest, err := prepareRouteController(options)
	if err != nil {
		t.Fatal(err)
	}
	restored, err := routeOptionsFromState(&modeState{
		RouteManifest: manifest, RouteTable: options.Table, RouteProtocol: options.Protocol,
	})
	if err != nil || restored.Kubeconfig != "" {
		t.Fatalf("managed credentials were not retained in the baseline: %v", err)
	}
	options.Kubeconfig = filepath.Join(t.TempDir(), "missing.conf")
	if _, err := prepareRouteController(options); err == nil {
		t.Fatal("accepted missing user-provided credentials")
	}
	options.Kubeconfig = ""
	options.Config = filepath.Join(t.TempDir(), "missing.yaml")
	if _, err := prepareRouteController(options); err == nil {
		t.Fatal("accepted missing user-provided controller configuration")
	}
}

func TestPreflightControllerIdentityChecksEveryManagedObject(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	if err := rbacv1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	// A managed installation already exists: every dry-run create returns
	// AlreadyExists and the preflight must still pass.
	resources := dynamicfake.NewSimpleDynamicClient(scheme,
		&corev1.ServiceAccount{
			ObjectMeta: metav1.ObjectMeta{
				Name:      controllerIdentity,
				Namespace: metav1.NamespaceSystem,
				Labels:    map[string]string{controllerOwnerLabel: "managed"},
			},
		},
	)
	client := fake.NewSimpleClientset(&corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      controllerIdentity,
			Namespace: metav1.NamespaceSystem,
		},
		Type: corev1.SecretTypeServiceAccountToken,
	})
	if err := preflightControllerIdentity(context.Background(), client, resources); err != nil {
		t.Fatal(err)
	}
	managed := map[string]bool{
		"serviceaccounts": true, "clusterroles": true, "clusterrolebindings": true,
		"roles": true, "rolebindings": true,
	}
	creates := 0
	for _, action := range resources.Actions() {
		create, ok := action.(clienttesting.CreateAction)
		if !ok {
			t.Fatalf("preflight issued a non-create action: %v", action)
		}
		if !managed[create.GetResource().Resource] {
			t.Fatalf("preflight created an unmanaged object: %v", action)
		}
		creates++
	}
	if creates != len(controllerIdentityResources()) {
		t.Fatalf(
			"expected %d identity creates, got %d",
			len(controllerIdentityResources()),
			creates,
		)
	}
	secrets := 0
	for _, action := range client.Actions() {
		if _, ok := action.(clienttesting.CreateAction); !ok {
			t.Fatalf("preflight issued a non-create action: %v", action)
		}
		secrets++
	}
	if secrets != 1 {
		t.Fatalf("expected one token secret create, got %d", secrets)
	}
}

func TestPreflightControllerIdentitySurfacesAdmissionDenial(t *testing.T) {
	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	if err := rbacv1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	resources := dynamicfake.NewSimpleDynamicClient(scheme)
	denied := apierrors.NewForbidden(
		schema.GroupResource{Resource: "clusterroles"}, controllerIdentity,
		errors.New("name is not in the allowlist"),
	)
	resources.PrependReactor(
		"create",
		"clusterroles",
		func(clienttesting.Action) (bool, runtime.Object, error) {
			return true, nil, denied
		},
	)
	err := preflightControllerIdentity(
		context.Background(), fake.NewSimpleClientset(), resources,
	)
	if err == nil || !strings.Contains(err.Error(), "admission preflight") ||
		!strings.Contains(err.Error(), "not in the allowlist") {
		t.Fatalf("admission denial was not surfaced: %v", err)
	}
}

func TestPreflightControllerCredentialsSkipsCustomKubeconfig(t *testing.T) {
	if err := preflightControllerCredentials(context.Background(), nil); err != nil {
		t.Fatalf("nil controller pod must skip the preflight: %v", err)
	}
	custom := &corev1.Pod{}
	// A controller rendered with a custom kubeconfig carries no managed
	// annotation, so no admission preflight applies.
	if err := preflightControllerCredentials(context.Background(), custom); err != nil {
		t.Fatalf("custom kubeconfig must skip the preflight: %v", err)
	}
}
