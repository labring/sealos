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
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"os"

	rbacV1 "k8s.io/api/rbac/v1"
)

func GetDefaultNamespace() string {
	return os.Getenv("NAMESPACE_NAME")
}

func GetUsersSubject(user string) []rbacV1.Subject {
	defaultNamespace := GetDefaultNamespace()
	if defaultNamespace == "" {
		defaultNamespace = "default"
	}
	return []rbacV1.Subject{
		{
			Kind:      "ServiceAccount",
			Name:      user,
			Namespace: defaultNamespace,
		},
	}
}

func GetUsersNamespace(user string) string {
	return fmt.Sprintf("ns-%s", user)
}

func GetUserRole(roletype userv1.UserRoleType) []rbacV1.PolicyRule {
	//TODO 权限这里不知道设置些什么
	switch roletype {
	case userv1.Owner:
		return []rbacV1.PolicyRule{
			{
				APIGroups: []string{"*"},
				Resources: []string{"*"},
				Verbs:     []string{"*"},
			},
		}
	case userv1.Manager:
		return []rbacV1.PolicyRule{
			{
				APIGroups: []string{"*"},
				Resources: []string{"*"},
				Verbs:     []string{"*"},
			},
		}
	case userv1.Developer:
		return []rbacV1.PolicyRule{
			{
				APIGroups: []string{"*"},
				Resources: []string{"*"},
				Verbs:     []string{"list", "get", "watch"},
			},
		}
	default:
		return []rbacV1.PolicyRule{
			{
				APIGroups: []string{"*"},
				Resources: []string{"*"},
				Verbs:     []string{"*"},
			},
		}
	}
}

func GetGroupRoleBindingName(sa string) string {
	return fmt.Sprintf("group-%s", sa)
}

func GetNewUsersSubject(user string) []rbacV1.Subject {
	return []rbacV1.Subject{
		{
			Kind:      "ServiceAccount",
			Name:      user,
			Namespace: GetUsersNamespace(user),
		},
	}
}
