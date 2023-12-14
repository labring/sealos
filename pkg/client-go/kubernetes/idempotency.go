/*
Copyright 2017 The Kubernetes Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package kubernetes

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	apps "k8s.io/api/apps/v1"
	v1 "k8s.io/api/core/v1"
	rbac "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/strategicpatch"
	"k8s.io/apimachinery/pkg/util/wait"
	clientset "k8s.io/client-go/kubernetes"

	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	// APICallRetryInterval defines how long kubeadm should wait before retrying a failed API operation
	APICallRetryInterval = 500 * time.Millisecond
	// PatchNodeTimeout specifies how long kubeadm should wait for applying the label and taint on the control-plane before timing out
	PatchNodeTimeout = 2 * time.Minute
	// KubeletHealthzPort is the port of the kubelet healthz endpoint
	KubeletHealthzPort = 10248
	KubeAPIServer      = "kube-apiserver"
	// KubeControllerManager defines variable used internally when referring to kube-controller-manager component
	KubeControllerManager = "kube-controller-manager"
	// KubeScheduler defines variable used internally when referring to kube-scheduler component
	KubeScheduler = "kube-scheduler"
)

type Idempotency interface {
	CreateOrUpdateConfigMap(cm *v1.ConfigMap) error
	CreateOrUpdateSecret(secret *v1.Secret) error
	CreateOrUpdateServiceAccount(sa *v1.ServiceAccount) error
	CreateOrUpdateDeployment(deploy *apps.Deployment) error
	CreateOrUpdateDaemonSet(ds *apps.DaemonSet) error
	DeleteDaemonSetForeground(namespace, name string) error
	DeleteDeploymentForeground(namespace, name string) error
	CreateOrUpdateRole(role *rbac.Role) error
	CreateOrUpdateRoleBinding(roleBinding *rbac.RoleBinding) error
	CreateOrUpdateClusterRole(clusterRole *rbac.ClusterRole) error
	CreateOrUpdateClusterRoleBinding(clusterRoleBinding *rbac.ClusterRoleBinding) error
	PatchNode(nodeName string, patchFn func(*v1.Node)) error
}

type kubeIdempotency struct {
	client clientset.Interface
}

// NewKubeIdempotency returns a new Idempotency object that talks to the given Kubernetes cluster
func NewKubeIdempotency(client clientset.Interface) Idempotency {
	return &kubeIdempotency{
		client: client,
	}
}

// CreateOrUpdateConfigMap creates a ConfigMap if the target resource doesn't exist. If the resource exists already, this function will update the resource instead.
func (ki *kubeIdempotency) CreateOrUpdateConfigMap(cm *v1.ConfigMap) error {
	if _, err := ki.client.CoreV1().ConfigMaps(cm.ObjectMeta.Namespace).Create(context.TODO(), cm, metav1.CreateOptions{}); err != nil {
		if !apierrors.IsAlreadyExists(err) {
			return fmt.Errorf("unable to create ConfigMap: %w", err)
		}

		if _, err := ki.client.CoreV1().ConfigMaps(cm.ObjectMeta.Namespace).Update(context.TODO(), cm, metav1.UpdateOptions{}); err != nil {
			return fmt.Errorf("unable to update ConfigMap: %w", err)
		}
	}
	return nil
}

// CreateOrUpdateSecret creates a Secret if the target resource doesn't exist. If the resource exists already, this function will update the resource instead.
func (ki *kubeIdempotency) CreateOrUpdateSecret(secret *v1.Secret) error {
	if _, err := ki.client.CoreV1().Secrets(secret.ObjectMeta.Namespace).Create(context.TODO(), secret, metav1.CreateOptions{}); err != nil {
		if !apierrors.IsAlreadyExists(err) {
			return fmt.Errorf("unable to create secret: %w", err)
		}

		if _, err := ki.client.CoreV1().Secrets(secret.ObjectMeta.Namespace).Update(context.TODO(), secret, metav1.UpdateOptions{}); err != nil {
			return fmt.Errorf("unable to update secret: %w", err)
		}
	}
	return nil
}

// CreateOrUpdateServiceAccount creates a ServiceAccount if the target resource doesn't exist. If the resource exists already, this function will update the resource instead.
func (ki *kubeIdempotency) CreateOrUpdateServiceAccount(sa *v1.ServiceAccount) error {
	if _, err := ki.client.CoreV1().ServiceAccounts(sa.ObjectMeta.Namespace).Create(context.TODO(), sa, metav1.CreateOptions{}); err != nil {
		// Note: We don't run .Update here afterwards as that's probably not required
		// Only thing that could be updated is annotations/labels in .metadata, but we don't use that currently
		if !apierrors.IsAlreadyExists(err) {
			return fmt.Errorf("unable to create serviceaccount: %w", err)
		}
	}
	return nil
}

// CreateOrUpdateDeployment creates a Deployment if the target resource doesn't exist. If the resource exists already, this function will update the resource instead.
func (ki *kubeIdempotency) CreateOrUpdateDeployment(deploy *apps.Deployment) error {
	if _, err := ki.client.AppsV1().Deployments(deploy.ObjectMeta.Namespace).Create(context.TODO(), deploy, metav1.CreateOptions{}); err != nil {
		if !apierrors.IsAlreadyExists(err) {
			return fmt.Errorf("unable to create deployment: %w", err)
		}

		if _, err := ki.client.AppsV1().Deployments(deploy.ObjectMeta.Namespace).Update(context.TODO(), deploy, metav1.UpdateOptions{}); err != nil {
			return fmt.Errorf("unable to update deployment: %w", err)
		}
	}
	return nil
}

// CreateOrUpdateDaemonSet creates a DaemonSet if the target resource doesn't exist. If the resource exists already, this function will update the resource instead.
func (ki *kubeIdempotency) CreateOrUpdateDaemonSet(ds *apps.DaemonSet) error {
	if _, err := ki.client.AppsV1().DaemonSets(ds.ObjectMeta.Namespace).Create(context.TODO(), ds, metav1.CreateOptions{}); err != nil {
		if !apierrors.IsAlreadyExists(err) {
			return fmt.Errorf("unable to create daemonset: %w", err)
		}

		if _, err := ki.client.AppsV1().DaemonSets(ds.ObjectMeta.Namespace).Update(context.TODO(), ds, metav1.UpdateOptions{}); err != nil {
			return fmt.Errorf("unable to update daemonset: %w", err)
		}
	}
	return nil
}

// DeleteDaemonSetForeground deletes the specified DaemonSet in foreground mode; i.e. it blocks until/makes sure all the managed Pods are deleted
func (ki *kubeIdempotency) DeleteDaemonSetForeground(namespace, name string) error {
	foregroundDelete := metav1.DeletePropagationForeground
	return ki.client.AppsV1().DaemonSets(namespace).Delete(context.TODO(), name, metav1.DeleteOptions{PropagationPolicy: &foregroundDelete})
}

// DeleteDeploymentForeground deletes the specified Deployment in foreground mode; i.e. it blocks until/makes sure all the managed Pods are deleted
func (ki *kubeIdempotency) DeleteDeploymentForeground(namespace, name string) error {
	foregroundDelete := metav1.DeletePropagationForeground
	return ki.client.AppsV1().Deployments(namespace).Delete(context.TODO(), name, metav1.DeleteOptions{PropagationPolicy: &foregroundDelete})
}

// CreateOrUpdateRole creates a Role if the target resource doesn't exist. If the resource exists already, this function will update the resource instead.
func (ki *kubeIdempotency) CreateOrUpdateRole(role *rbac.Role) error {
	if _, err := ki.client.RbacV1().Roles(role.ObjectMeta.Namespace).Create(context.TODO(), role, metav1.CreateOptions{}); err != nil {
		if !apierrors.IsAlreadyExists(err) {
			return fmt.Errorf("unable to create RBAC role: %w", err)
		}

		if _, err := ki.client.RbacV1().Roles(role.ObjectMeta.Namespace).Update(context.TODO(), role, metav1.UpdateOptions{}); err != nil {
			return fmt.Errorf("unable to update RBAC role: %w", err)
		}
	}
	return nil
}

// CreateOrUpdateRoleBinding creates a RoleBinding if the target resource doesn't exist. If the resource exists already, this function will update the resource instead.
func (ki *kubeIdempotency) CreateOrUpdateRoleBinding(roleBinding *rbac.RoleBinding) error {
	if _, err := ki.client.RbacV1().RoleBindings(roleBinding.ObjectMeta.Namespace).Create(context.TODO(), roleBinding, metav1.CreateOptions{}); err != nil {
		if !apierrors.IsAlreadyExists(err) {
			return fmt.Errorf("unable to create RBAC rolebinding: %w", err)
		}

		if _, err := ki.client.RbacV1().RoleBindings(roleBinding.ObjectMeta.Namespace).Update(context.TODO(), roleBinding, metav1.UpdateOptions{}); err != nil {
			return fmt.Errorf("unable to update RBAC rolebinding: %w", err)
		}
	}
	return nil
}

// CreateOrUpdateClusterRole creates a ClusterRole if the target resource doesn't exist. If the resource exists already, this function will update the resource instead.
func (ki *kubeIdempotency) CreateOrUpdateClusterRole(clusterRole *rbac.ClusterRole) error {
	if _, err := ki.client.RbacV1().ClusterRoles().Create(context.TODO(), clusterRole, metav1.CreateOptions{}); err != nil {
		if !apierrors.IsAlreadyExists(err) {
			return fmt.Errorf("unable to create RBAC clusterrole: %w", err)
		}

		if _, err := ki.client.RbacV1().ClusterRoles().Update(context.TODO(), clusterRole, metav1.UpdateOptions{}); err != nil {
			return fmt.Errorf("unable to update RBAC clusterrole: %w", err)
		}
	}
	return nil
}

// CreateOrUpdateClusterRoleBinding creates a ClusterRoleBinding if the target resource doesn't exist. If the resource exists already, this function will update the resource instead.
func (ki *kubeIdempotency) CreateOrUpdateClusterRoleBinding(clusterRoleBinding *rbac.ClusterRoleBinding) error {
	if _, err := ki.client.RbacV1().ClusterRoleBindings().Create(context.TODO(), clusterRoleBinding, metav1.CreateOptions{}); err != nil {
		if !apierrors.IsAlreadyExists(err) {
			return fmt.Errorf("unable to create RBAC clusterrolebinding: %w", err)
		}

		if _, err := ki.client.RbacV1().ClusterRoleBindings().Update(context.TODO(), clusterRoleBinding, metav1.UpdateOptions{}); err != nil {
			return fmt.Errorf("unable to update RBAC clusterrolebinding: %w", err)
		}
	}
	return nil
}

// patchNodeOnce executes patchFn on the node object found by the node name.
// This is a condition function meant to be used with wait.Poll. false, nil
// implies it is safe to try again, an error indicates no more tries should be
// made and true indicates success.
func (ki *kubeIdempotency) patchNodeOnce(nodeName string, patchFn func(*v1.Node)) func(ctx context.Context) (bool, error) {
	return func(ctx context.Context) (bool, error) {
		// First get the node object
		n, err := ki.client.CoreV1().Nodes().Get(ctx, nodeName, metav1.GetOptions{})
		if err != nil {
			return false, nil //nolint:nilerr
		}

		// The node may appear to have no labels at first,
		// so we wait for it to get hostname label.
		if _, found := n.ObjectMeta.Labels[v1.LabelHostname]; !found {
			return false, nil
		}

		oldData, err := json.Marshal(n)
		if err != nil {
			return false, fmt.Errorf("failed to marshal unmodified node %q into JSON: %w", n.Name, err)
		}

		// Execute the mutating function
		patchFn(n)

		newData, err := json.Marshal(n)
		if err != nil {
			return false, fmt.Errorf("failed to marshal modified node %q into JSON: %w", n.Name, err)
		}

		patchBytes, err := strategicpatch.CreateTwoWayMergePatch(oldData, newData, v1.Node{})
		if err != nil {
			return false, fmt.Errorf("failed to create two way merge patch: %w", err)
		}

		if _, err := ki.client.CoreV1().Nodes().Patch(ctx, n.Name, types.StrategicMergePatchType, patchBytes, metav1.PatchOptions{}); err != nil {
			if apierrors.IsConflict(err) {
				logger.Debug("Temporarily unable to update node metadata due to conflict (will retry)")
				return false, nil
			}
			return false, fmt.Errorf("error patching node %q through apiserver: %w", n.Name, err)
		}

		return true, nil
	}
}

// PatchNode tries to patch a node using patchFn for the actual mutating logic.
// Retries are provided by the wait package.
func (ki *kubeIdempotency) PatchNode(nodeName string, patchFn func(*v1.Node)) error {
	ctx, cancel := context.WithTimeout(context.Background(), PatchNodeTimeout)
	defer cancel()
	return wait.PollUntilContextCancel(ctx, APICallRetryInterval, true, ki.patchNodeOnce(nodeName, patchFn))
	// wait.Poll will rerun the condition function every interval function if
	// the function returns false. If the condition function returns an error
	// then the retries end and the error is returned.
	//return wait.Poll(APICallRetryInterval, PatchNodeTimeout, ki.patchNodeOnce(nodeName, patchFn))
}
