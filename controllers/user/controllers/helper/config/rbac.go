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

func GetUserRole() []rbacV1.PolicyRule {
	return []rbacV1.PolicyRule{
		{
			APIGroups: []string{"*"},
			Resources: []string{"*"},
			Verbs:     []string{"*"},
		},
	}
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
