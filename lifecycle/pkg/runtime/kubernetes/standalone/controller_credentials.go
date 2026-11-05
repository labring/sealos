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
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"time"

	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/wait"
	"k8s.io/client-go/dynamic"
	clientset "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
)

const (
	controllerIdentity   = "sealos-route-controller"
	controllerOwnerLabel = "sealos.io/route-controller"
)

type controllerIdentityResource struct {
	resource schema.GroupVersionResource
	object   runtime.Object
}

func controllerIdentityResources() []controllerIdentityResource {
	subjects := []rbacv1.Subject{{
		Kind: "ServiceAccount", Name: controllerIdentity, Namespace: "kube-system",
	}}
	return []controllerIdentityResource{
		{
			resource: corev1.SchemeGroupVersion.WithResource("serviceaccounts"),
			object: &corev1.ServiceAccount{
				TypeMeta:   metav1.TypeMeta{APIVersion: "v1", Kind: "ServiceAccount"},
				ObjectMeta: metav1.ObjectMeta{Namespace: "kube-system"},
			},
		},
		{
			resource: rbacv1.SchemeGroupVersion.WithResource("clusterroles"),
			object: &rbacv1.ClusterRole{
				TypeMeta: metav1.TypeMeta{
					APIVersion: rbacv1.SchemeGroupVersion.String(), Kind: "ClusterRole",
				},
				Rules: []rbacv1.PolicyRule{
					{
						APIGroups: []string{""}, Resources: []string{"nodes"},
						Verbs: []string{"get", "list", "watch"},
					},
					{
						APIGroups: []string{"cilium.io"}, Resources: []string{"ciliumnodes"},
						Verbs: []string{"get", "list", "watch"},
					},
				},
			},
		},
		{
			resource: rbacv1.SchemeGroupVersion.WithResource("clusterrolebindings"),
			object: &rbacv1.ClusterRoleBinding{
				TypeMeta: metav1.TypeMeta{
					APIVersion: rbacv1.SchemeGroupVersion.String(), Kind: "ClusterRoleBinding",
				},
				RoleRef: rbacv1.RoleRef{
					APIGroup: rbacv1.GroupName, Kind: "ClusterRole", Name: controllerIdentity,
				},
				Subjects: subjects,
			},
		},
		{
			resource: rbacv1.SchemeGroupVersion.WithResource("roles"),
			object: &rbacv1.Role{
				TypeMeta: metav1.TypeMeta{
					APIVersion: rbacv1.SchemeGroupVersion.String(), Kind: "Role",
				},
				ObjectMeta: metav1.ObjectMeta{Namespace: "kube-system"},
				Rules: []rbacv1.PolicyRule{
					{
						APIGroups: []string{""}, Resources: []string{"configmaps"},
						ResourceNames: []string{"cilium-config", "kubeadm-config"},
						Verbs:         []string{"get"},
					},
					{
						APIGroups: []string{""}, Resources: []string{"pods"},
						Verbs: []string{"get", "list", "watch"},
					},
				},
			},
		},
		{
			resource: rbacv1.SchemeGroupVersion.WithResource("rolebindings"),
			object: &rbacv1.RoleBinding{
				TypeMeta: metav1.TypeMeta{
					APIVersion: rbacv1.SchemeGroupVersion.String(), Kind: "RoleBinding",
				},
				ObjectMeta: metav1.ObjectMeta{Namespace: "kube-system"},
				RoleRef: rbacv1.RoleRef{
					APIGroup: rbacv1.GroupName,
					Kind:     "Role",
					Name:     controllerIdentity,
				},
				Subjects: subjects,
			},
		},
	}
}

func ensureControllerIdentity(ctx context.Context, client dynamic.Interface) error {
	for _, item := range controllerIdentityResources() {
		metadata, err := meta.Accessor(item.object)
		if err != nil {
			return err
		}
		metadata.SetName(controllerIdentity)
		metadata.SetLabels(map[string]string{controllerOwnerLabel: "managed"})
		resource := client.Resource(item.resource).Namespace(metadata.GetNamespace())
		current, err := resource.Get(ctx, controllerIdentity, metav1.GetOptions{})
		if err == nil && current.GetLabels()[controllerOwnerLabel] != "managed" {
			return fmt.Errorf(
				"refusing to replace unmanaged %s %s", item.resource.Resource, controllerIdentity,
			)
		}
		if err != nil && !apierrors.IsNotFound(err) {
			return err
		}
		data, err := json.Marshal(item.object)
		if err != nil {
			return err
		}
		if _, err := resource.Patch(
			ctx,
			controllerIdentity,
			types.ApplyPatchType,
			data,
			metav1.PatchOptions{
				FieldManager: controllerIdentity,
			},
		); err != nil {
			return err
		}
	}
	return nil
}

func controllerToken(ctx context.Context, client clientset.Interface) ([]byte, error) {
	account, err := client.CoreV1().ServiceAccounts("kube-system").
		Get(ctx, controllerIdentity, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}
	secrets := client.CoreV1().Secrets("kube-system")
	secret, err := secrets.Get(ctx, controllerIdentity, metav1.GetOptions{})
	if apierrors.IsNotFound(err) {
		secret, err = secrets.Create(ctx, &corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{
				Name:      controllerIdentity,
				Namespace: "kube-system",
				Labels:    map[string]string{controllerOwnerLabel: "managed"},
				Annotations: map[string]string{
					corev1.ServiceAccountNameKey: controllerIdentity,
					corev1.ServiceAccountUIDKey:  string(account.UID),
				},
			},
			Type: corev1.SecretTypeServiceAccountToken,
		}, metav1.CreateOptions{})
	}
	if err != nil {
		return nil, err
	}
	err = wait.PollUntilContextCancel(
		ctx,
		time.Second,
		true,
		func(ctx context.Context) (bool, error) {
			secret, err = secrets.Get(ctx, secret.Name, metav1.GetOptions{})
			if err != nil {
				return false, err
			}
			if secret.Labels[controllerOwnerLabel] != "managed" ||
				secret.Type != corev1.SecretTypeServiceAccountToken ||
				secret.Annotations[corev1.ServiceAccountNameKey] != controllerIdentity ||
				secret.Annotations[corev1.ServiceAccountUIDKey] != string(account.UID) {
				return false, errors.New(
					"route-controller token Secret does not belong to the managed ServiceAccount",
				)
			}
			return len(secret.Data[corev1.ServiceAccountTokenKey]) != 0, nil
		},
	)
	if err != nil {
		return nil, err
	}
	return secret.Data[corev1.ServiceAccountTokenKey], nil
}

func controllerKubeconfig(config *rest.Config, token []byte) ([]byte, error) {
	ca := config.CAData
	if len(ca) == 0 && config.CAFile != "" {
		var err error
		ca, err = os.ReadFile(config.CAFile)
		if err != nil {
			return nil, err
		}
	}
	if len(ca) == 0 || config.Insecure || len(token) == 0 {
		return nil, errors.New(
			"route-controller requires a trusted cluster CA and a ServiceAccount token",
		)
	}
	return clientcmd.Write(clientcmdapi.Config{
		Clusters: map[string]*clientcmdapi.Cluster{
			"local": {
				Server:                   config.Host,
				CertificateAuthorityData: ca,
				TLSServerName:            config.ServerName,
			},
		},
		AuthInfos: map[string]*clientcmdapi.AuthInfo{
			controllerIdentity: {Token: string(token)},
		},
		Contexts: map[string]*clientcmdapi.Context{
			"local": {Cluster: "local", AuthInfo: controllerIdentity},
		},
		CurrentContext: "local",
	})
}

func controllerAdminClient() (*rest.Config, clientset.Interface, dynamic.Interface, error) {
	config, err := clientcmd.BuildConfigFromFlags("", "/etc/kubernetes/admin.conf")
	if err != nil {
		return nil, nil, nil, err
	}
	config.Timeout = 10 * time.Second
	client, err := clientset.NewForConfig(config)
	if err != nil {
		return nil, nil, nil, err
	}
	resources, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, nil, nil, err
	}
	return config, client, resources, nil
}

// RemoveControllerCredentials deletes the shared identity behind the managed
// route-controller kubeconfig. Every host must already have stopped its
// controller: deleting the token Secret revokes the credential running
// instances still use. Objects without the managed label are refused, and
// missing objects count as removed, so a retry after a partial cleanup is
// safe. Re-enabling the controller recreates everything.
func RemoveControllerCredentials(ctx context.Context, client clientset.Interface) error {
	secrets := client.CoreV1().Secrets(metav1.NamespaceSystem)
	secret, err := secrets.Get(ctx, controllerIdentity, metav1.GetOptions{})
	switch {
	case apierrors.IsNotFound(err):
	case err != nil:
		return err
	case secret.Labels[controllerOwnerLabel] != "managed":
		return fmt.Errorf("refusing to delete unmanaged token Secret %s", controllerIdentity)
	default:
		if err := secrets.Delete(ctx, controllerIdentity, metav1.DeleteOptions{}); err != nil &&
			!apierrors.IsNotFound(err) {
			return err
		}
	}
	deletions := []struct {
		kind string
		get  func(ctx context.Context, name string) (metav1.Object, error)
		drop func(ctx context.Context, name string) error
	}{
		{
			"ServiceAccount",
			func(ctx context.Context, name string) (metav1.Object, error) {
				return client.CoreV1().ServiceAccounts(metav1.NamespaceSystem).
					Get(ctx, name, metav1.GetOptions{})
			},
			func(ctx context.Context, name string) error {
				return client.CoreV1().ServiceAccounts(metav1.NamespaceSystem).
					Delete(ctx, name, metav1.DeleteOptions{})
			},
		},
		{
			"ClusterRole",
			func(ctx context.Context, name string) (metav1.Object, error) {
				return client.RbacV1().ClusterRoles().Get(ctx, name, metav1.GetOptions{})
			},
			func(ctx context.Context, name string) error {
				return client.RbacV1().ClusterRoles().Delete(ctx, name, metav1.DeleteOptions{})
			},
		},
		{
			"ClusterRoleBinding",
			func(ctx context.Context, name string) (metav1.Object, error) {
				return client.RbacV1().ClusterRoleBindings().Get(ctx, name, metav1.GetOptions{})
			},
			func(ctx context.Context, name string) error {
				return client.RbacV1().
					ClusterRoleBindings().
					Delete(ctx, name, metav1.DeleteOptions{})
			},
		},
		{
			"Role",
			func(ctx context.Context, name string) (metav1.Object, error) {
				return client.RbacV1().Roles(metav1.NamespaceSystem).
					Get(ctx, name, metav1.GetOptions{})
			},
			func(ctx context.Context, name string) error {
				return client.RbacV1().Roles(metav1.NamespaceSystem).
					Delete(ctx, name, metav1.DeleteOptions{})
			},
		},
		{
			"RoleBinding",
			func(ctx context.Context, name string) (metav1.Object, error) {
				return client.RbacV1().RoleBindings(metav1.NamespaceSystem).
					Get(ctx, name, metav1.GetOptions{})
			},
			func(ctx context.Context, name string) error {
				return client.RbacV1().RoleBindings(metav1.NamespaceSystem).
					Delete(ctx, name, metav1.DeleteOptions{})
			},
		},
	}
	for _, item := range deletions {
		object, err := item.get(ctx, controllerIdentity)
		if apierrors.IsNotFound(err) {
			continue
		}
		if err != nil {
			return err
		}
		if object.GetLabels()[controllerOwnerLabel] != "managed" {
			return fmt.Errorf(
				"refusing to delete unmanaged %s %s", item.kind, controllerIdentity,
			)
		}
		if err := item.drop(ctx, controllerIdentity); err != nil && !apierrors.IsNotFound(err) {
			return err
		}
	}
	return nil
}

func ensureControllerCredentials(ctx context.Context, pod *corev1.Pod) error {
	if pod.Annotations[controllerCredentialsAnnotation] != "managed" {
		return nil
	}
	config, client, resources, err := controllerAdminClient()
	if err != nil {
		return err
	}
	if err := wait.PollUntilContextCancel(
		ctx,
		time.Second,
		true,
		func(ctx context.Context) (bool, error) {
			err := client.Discovery().RESTClient().Get().AbsPath("/readyz").Do(ctx).Error()
			if apierrors.IsUnauthorized(err) || apierrors.IsForbidden(err) {
				// A freshly started API server briefly rejects authenticated
				// probes until its bootstrap controller creates the default
				// RBAC roles. Keep waiting instead of aborting.
				return false, nil
			}
			return err == nil, nil
		},
	); err != nil {
		return err
	}
	if err := ensureControllerIdentity(ctx, resources); err != nil {
		return err
	}
	token, err := controllerToken(ctx, client)
	if err != nil {
		return err
	}
	data, err := controllerKubeconfig(config, token)
	if err != nil {
		return err
	}
	previous, err := os.ReadFile(DefaultRouteControllerKubeconfig)
	if err == nil && bytes.Equal(previous, data) {
		return os.Chmod(DefaultRouteControllerKubeconfig, 0o600)
	}
	return atomicModeFile(DefaultRouteControllerKubeconfig, data, 0o600)
}

// preflightControllerCredentials server-side dry-runs every object the managed
// credential flow creates. Validating admission sees dry-run requests, so
// policies that would deny the conversion surface during --check-only instead
// of pausing the conversion after it started. Existing objects are accepted:
// admission still runs for them, and the real flow updates in place.
func preflightControllerCredentials(ctx context.Context, pod *corev1.Pod) error {
	if pod == nil || pod.Annotations[controllerCredentialsAnnotation] != "managed" {
		return nil
	}
	_, client, resources, err := controllerAdminClient()
	if err != nil {
		return err
	}
	return preflightControllerIdentity(ctx, client, resources)
}

func preflightControllerIdentity(
	ctx context.Context,
	client clientset.Interface,
	resources dynamic.Interface,
) error {
	dryRun := metav1.CreateOptions{DryRun: []string{metav1.DryRunAll}}
	for _, item := range controllerIdentityResources() {
		metadata, err := meta.Accessor(item.object)
		if err != nil {
			return err
		}
		metadata.SetName(controllerIdentity)
		data, err := json.Marshal(item.object)
		if err != nil {
			return err
		}
		var object unstructured.Unstructured
		if err := json.Unmarshal(data, &object.Object); err != nil {
			return err
		}
		_, err = resources.Resource(item.resource).Namespace(metadata.GetNamespace()).
			Create(ctx, &object, dryRun)
		if err != nil && !apierrors.IsAlreadyExists(err) {
			return fmt.Errorf(
				"admission preflight for %s %s: %w",
				item.resource.Resource, controllerIdentity, err,
			)
		}
	}
	_, err := client.CoreV1().Secrets(metav1.NamespaceSystem).Create(ctx, &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      controllerIdentity,
			Namespace: metav1.NamespaceSystem,
			Labels:    map[string]string{controllerOwnerLabel: "managed"},
			// API validation requires the owning ServiceAccount name on
			// token secrets; the UID is only known once the account exists.
			Annotations: map[string]string{
				corev1.ServiceAccountNameKey: controllerIdentity,
			},
		},
		Type: corev1.SecretTypeServiceAccountToken,
	}, dryRun)
	if err != nil && !apierrors.IsAlreadyExists(err) {
		return fmt.Errorf("admission preflight for token secret: %w", err)
	}
	return nil
}
