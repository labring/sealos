/*
Copyright 2023 labring.

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

package controllers

import (
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	adminerv1 "github.com/labring/sealos/controllers/db/adminer/api/v1"
)

func (r *AdminerReconciler) createSecret(adminer *adminerv1.Adminer) *corev1.Secret {
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      adminer.Name,
			Namespace: adminer.Namespace,
		},

		StringData: map[string]string{
			"servers.php": buildConnectionFileContent(adminer.Spec.Connections),
		},
		Type: corev1.SecretTypeOpaque,
	}

	return secret
}
