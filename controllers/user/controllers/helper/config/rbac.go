/*
Copyright 2023 cuisongliu@qq.com.

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

package config

import (
	"fmt"
	"os"
	"strings"

	rbacv1 "k8s.io/api/rbac/v1"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
)

func GetDefaultNamespace() string {
	return os.Getenv("NAMESPACE_NAME")
}

func GetUsersSubject(user string) []rbacv1.Subject {
	return []rbacv1.Subject{
		{
			Kind:      "ServiceAccount",
			Name:      user,
			Namespace: GetUsersNamespace(user),
		},
	}
}

func GetUserNameByNamespace(namespace string) string {
	return strings.TrimPrefix(namespace, "ns-")
}

func GetUsersNamespace(user string) string {
	return fmt.Sprintf("ns-%s", user)
}

func GetGroupRoleBindingName(user string) string {
	return fmt.Sprintf("rb-%s", user)
}

func GetUserRole(roleType userv1.RoleType) []rbacv1.PolicyRule {
	switch roleType {
	case userv1.OwnerRoleType:
		return []rbacv1.PolicyRule{
			{
				APIGroups: []string{"*"},
				Resources: []string{"*"},
				Verbs:     []string{"*"},
			},
		}
	case userv1.ManagerRoleType:
		return []rbacv1.PolicyRule{
			{
				APIGroups: []string{"*"},
				Resources: []string{"*"},
				Verbs:     []string{"*"},
			},
		}
	case userv1.DeveloperRoleType:
		return []rbacv1.PolicyRule{
			{
				APIGroups: []string{"*"},
				Resources: []string{"*"},
				Verbs:     []string{"list", "watch", "get"},
			},
		}
	default:
		return []rbacv1.PolicyRule{}
	}
}
