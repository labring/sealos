/*
Copyright 2022 labring.

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

package kubeconfig

import (
	"context"
	"testing"

	config2 "github.com/labring/sealos/controllers/user/controllers/helper/config"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/scheme"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestCleanupLegacyBoundTokenSecrets(t *testing.T) {
	t.Parallel()

	const (
		userName        = "alice"
		currentSecret   = "sealos-token-alice-new"
		legacySecret    = "sealos-token-alice-old"
		duplicateSecret = "sealos-token-alice-dupe"
		otherSecret     = "sealos-token-bob-old"
	)

	current := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      currentSecret,
			Namespace: config2.GetUserSystemNamespace(),
			Annotations: map[string]string{
				corev1.ServiceAccountNameKey: userName,
			},
		},
		Type: corev1.SecretTypeOpaque,
	}
	legacy := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      legacySecret,
			Namespace: config2.GetUserSystemNamespace(),
			Annotations: map[string]string{
				corev1.ServiceAccountNameKey: userName,
			},
		},
		Type: corev1.SecretTypeServiceAccountToken,
	}
	duplicate := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      duplicateSecret,
			Namespace: config2.GetUserSystemNamespace(),
			Annotations: map[string]string{
				corev1.ServiceAccountNameKey: userName,
			},
		},
		Type: corev1.SecretTypeOpaque,
	}
	other := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      otherSecret,
			Namespace: config2.GetUserSystemNamespace(),
			Annotations: map[string]string{
				corev1.ServiceAccountNameKey: "bob",
			},
		},
		Type: corev1.SecretTypeServiceAccountToken,
	}

	cli := fake.NewClientBuilder().
		WithScheme(scheme.Scheme).
		WithObjects(current, legacy, duplicate, other).
		WithIndex(&corev1.Secret{}, corev1.ServiceAccountNameKey, func(obj client.Object) []string {
			secret, ok := obj.(*corev1.Secret)
			if !ok || secret.Annotations == nil {
				return nil
			}
			value := secret.Annotations[corev1.ServiceAccountNameKey]
			if value == "" {
				return nil
			}
			return []string{value}
		}).
		Build()

	if err := CleanupLegacyBoundTokenSecrets(
		context.Background(),
		cli,
		cli,
		userName,
		currentSecret,
	); err != nil {
		t.Fatalf("cleanup legacy secrets: %v", err)
	}

	var got corev1.Secret
	if err := cli.Get(context.Background(), client.ObjectKeyFromObject(current), &got); err != nil {
		t.Fatalf("get current secret: %v", err)
	}
	if got.Type != corev1.SecretTypeOpaque {
		t.Fatalf("current secret type = %s, want %s", got.Type, corev1.SecretTypeOpaque)
	}

	if err := cli.Get(
		context.Background(),
		client.ObjectKeyFromObject(legacy),
		&got,
	); !apierrors.IsNotFound(err) {
		t.Fatalf("legacy secret err = %v, want not found", err)
	}
	if err := cli.Get(
		context.Background(),
		client.ObjectKeyFromObject(duplicate),
		&got,
	); !apierrors.IsNotFound(err) {
		t.Fatalf("duplicate secret err = %v, want not found", err)
	}

	if err := cli.Get(context.Background(), client.ObjectKeyFromObject(other), &got); err != nil {
		t.Fatalf("get other secret: %v", err)
	}
}

func TestServiceAccountConfigWithForceNewSecret(t *testing.T) {
	t.Parallel()

	const (
		userName  = "alice"
		oldSecret = "sealos-token-alice-old"
		namespace = "user-system"
	)

	sa := &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name:      userName,
			Namespace: namespace,
		},
		Secrets: []corev1.ObjectReference{
			{
				Name: oldSecret,
			},
		},
	}

	cli := fake.NewClientBuilder().
		WithScheme(scheme.Scheme).
		WithObjects(sa).
		Build()

	cfg := &ServiceAccountConfig{
		DefaultConfig: &DefaultConfig{
			user:              userName,
			clusterName:       "",
			expirationSeconds: defaultCSRExpirationSeconds,
		},
		namespace:      namespace,
		sa:             sa,
		forceNewSecret: true,
	}

	if err := cfg.applyServiceAccount(nil, cli); err != nil {
		t.Fatalf("apply service account: %v", err)
	}
	if len(cfg.sa.Secrets) != 1 {
		t.Fatalf("secret count = %d, want 1", len(cfg.sa.Secrets))
	}
	if cfg.sa.Secrets[0].Name == oldSecret {
		t.Fatalf("secret name reused old secret %q", oldSecret)
	}
	if cfg.secretName != cfg.sa.Secrets[0].Name {
		t.Fatalf(
			"cached secret name %q != current secret name %q",
			cfg.secretName,
			cfg.sa.Secrets[0].Name,
		)
	}
}
