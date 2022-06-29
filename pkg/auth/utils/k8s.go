// Copyright © 2022 sealos.
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

package utils

import (
	"context"
	"fmt"

	"github.com/labring/sealos/pkg/auth/conf"
	"github.com/labring/sealos/pkg/client-go/kubernetes"
	coreV1 "k8s.io/api/core/v1"
	rbacV1 "k8s.io/api/rbac/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	applyCoreV1 "k8s.io/client-go/applyconfigurations/core/v1"
	applyMetaV1 "k8s.io/client-go/applyconfigurations/meta/v1"
	applyRbacV1 "k8s.io/client-go/applyconfigurations/rbac/v1"
)

func ApplyServiceAccount(client kubernetes.Client, username string) (*coreV1.ServiceAccount, error) {
	kind := "ServiceAccount"
	apiVersion := "v1"
	return client.Kubernetes().CoreV1().ServiceAccounts(conf.Namespace).Apply(context.TODO(),
		&applyCoreV1.ServiceAccountApplyConfiguration{
			TypeMetaApplyConfiguration: applyMetaV1.TypeMetaApplyConfiguration{
				Kind:       &kind,
				APIVersion: &apiVersion,
			},
			ObjectMetaApplyConfiguration: &applyMetaV1.ObjectMetaApplyConfiguration{
				Name:      &username,
				Namespace: &conf.Namespace,
			},
		}, metaV1.ApplyOptions{FieldManager: "application/apply-patch"})
}

func ApplyClusterRoleBinding(client kubernetes.Client, username string) (*rbacV1.ClusterRoleBinding, error) {
	kind := "ClusterRoleBinding"
	apiVersion := "rbac.authorization.k8s.io/v1"
	subjectKind := "ServiceAccount"
	apiGroup := "rbac.authorization.k8s.io"
	roleRefKind := "ClusterRole"
	roleRefName := "cluster-admin"

	return client.Kubernetes().RbacV1().ClusterRoleBindings().Apply(context.TODO(),
		&applyRbacV1.ClusterRoleBindingApplyConfiguration{
			TypeMetaApplyConfiguration: applyMetaV1.TypeMetaApplyConfiguration{
				Kind:       &kind,
				APIVersion: &apiVersion,
			},
			ObjectMetaApplyConfiguration: &applyMetaV1.ObjectMetaApplyConfiguration{
				Name: &username,
			},
			Subjects: []applyRbacV1.SubjectApplyConfiguration{
				{
					Kind:      &subjectKind,
					Name:      &username,
					Namespace: &conf.Namespace,
				},
			},
			RoleRef: &applyRbacV1.RoleRefApplyConfiguration{
				APIGroup: &apiGroup,
				Kind:     &roleRefKind,
				Name:     &roleRefName,
			},
		}, metaV1.ApplyOptions{FieldManager: "application/apply-patch"})
}

func ApplySecret(client kubernetes.Client, username string) (*coreV1.Secret, error) {
	kind := "Secret"
	apiVersion := "v1"
	name := fmt.Sprintf("%s-%s", username, "token")
	secretType := coreV1.SecretType("kubernetes.io/service-account-token")

	return client.Kubernetes().CoreV1().Secrets(conf.Namespace).Apply(context.TODO(), &applyCoreV1.SecretApplyConfiguration{
		TypeMetaApplyConfiguration: applyMetaV1.TypeMetaApplyConfiguration{
			Kind:       &kind,
			APIVersion: &apiVersion,
		},
		ObjectMetaApplyConfiguration: &applyMetaV1.ObjectMetaApplyConfiguration{
			Name:      &name,
			Namespace: &conf.Namespace,
			Annotations: map[string]string{
				"kubernetes.io/service-account.name": username,
			},
		},
		Type: &secretType,
	}, metaV1.ApplyOptions{FieldManager: "application/apply-patch"})
}

func ApplyConfigMap(client kubernetes.Client, name string, dataKey string, dataValue string) (*coreV1.ConfigMap, error) {
	kind := "ConfigMap"
	apiVersion := "v1"

	return client.Kubernetes().CoreV1().ConfigMaps(conf.Namespace).Apply(context.TODO(), &applyCoreV1.ConfigMapApplyConfiguration{
		TypeMetaApplyConfiguration: applyMetaV1.TypeMetaApplyConfiguration{
			Kind:       &kind,
			APIVersion: &apiVersion,
		},
		ObjectMetaApplyConfiguration: &applyMetaV1.ObjectMetaApplyConfiguration{
			Name:      &name,
			Namespace: &conf.Namespace,
		},
		Data: map[string]string{
			dataKey: dataValue,
		},
	}, metaV1.ApplyOptions{FieldManager: "application/apply-patch"})
}
