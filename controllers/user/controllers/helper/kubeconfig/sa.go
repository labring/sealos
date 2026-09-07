/*
Copyright 2022 cuisongliu@qq.com.

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
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	config2 "github.com/labring/sealos/controllers/user/controllers/helper/config"
	authenticationv1 "k8s.io/api/authentication/v1"
	v1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/utils/ptr"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

func (sac *ServiceAccountConfig) Apply(
	config *rest.Config,
	client client.Client,
) (*api.Config, error) {
	cfg, _, err := sac.ApplyWithTokenRequest(context.Background(), config, client)
	return cfg, err
}

func (sac *ServiceAccountConfig) ApplyWithTokenRequest(
	ctx context.Context,
	config *rest.Config,
	client client.Client,
) (*api.Config, metav1.Time, error) {
	if err := sac.applyServiceAccount(ctx, config, client); err != nil {
		return nil, metav1.Time{}, fmt.Errorf("failed to apply service account error: %w", err)
	}
	boundSecret, err := sac.applyBoundTokenSecret(ctx, client)
	if err != nil {
		return nil, metav1.Time{}, fmt.Errorf("failed to apply bound token secret: %w", err)
	}
	tokenRequest, err := sac.requestToken(ctx, config, boundSecret)
	if err != nil {
		return nil, metav1.Time{}, fmt.Errorf("failed to fetch token: %w", err)
	}
	cfg, err := sac.generatorKubeConfig(config, tokenRequest.Status.Token)
	if err != nil {
		return nil, metav1.Time{}, fmt.Errorf("failed to generate kube config: %w", err)
	}
	return cfg, tokenRequest.Status.ExpirationTimestamp, nil
}

func (sac *ServiceAccountConfig) applyServiceAccount(
	ctx context.Context,
	_ *rest.Config,
	client client.Client,
) error {
	sa := sac.sa
	if sa == nil {
		sa = &v1.ServiceAccount{
			ObjectMeta: metav1.ObjectMeta{
				Name:      sac.user,
				Namespace: sac.namespace,
			},
		}
	}
	if sa.Name == "" {
		sa.Name = sac.user
	}
	if sa.Namespace == "" {
		sa.Namespace = sac.namespace
	}
	_, err := controllerutil.CreateOrUpdate(ctx, client, sa, func() error {
		if sac.forceNewSecret || len(sa.Secrets) == 0 {
			sa.Secrets = []v1.ObjectReference{
				{
					Name: sac.generateSecretName(),
				},
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	sac.sa = sa
	if len(sa.Secrets) > 0 {
		sac.secretName = sa.Secrets[0].Name
	}
	return nil
}

func (sac *ServiceAccountConfig) applyBoundTokenSecret(
	ctx context.Context,
	cli client.Client,
) (*v1.Secret, error) {
	secretName := sac.secretName
	if secretName == "" {
		secretName = sac.generateSecretName()
	}
	secret := &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      secretName,
			Namespace: sac.namespace,
		},
	}
	_, err := controllerutil.CreateOrUpdate(ctx, cli, secret, func() error {
		// Secret type is immutable after creation. Keep the type of legacy
		// bound secrets and use Opaque only for newly created secrets.
		if secret.Type == "" {
			secret.Type = v1.SecretTypeOpaque
		}
		if secret.Annotations == nil {
			secret.Annotations = map[string]string{}
		}
		secret.Annotations[v1.ServiceAccountNameKey] = sac.user
		if sac.sa != nil {
			secret.OwnerReferences = append([]metav1.OwnerReference(nil), sac.sa.OwnerReferences...)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	if secret.UID == "" {
		return nil, fmt.Errorf(
			"bound token secret %s/%s has empty uid",
			secret.Namespace,
			secret.Name,
		)
	}
	return secret, nil
}

// CleanupLegacyBoundTokenSecrets removes stale bound token secrets for a user.
func CleanupLegacyBoundTokenSecrets(
	ctx context.Context,
	reader client.Reader,
	writer client.Writer,
	userName, keepSecretName string,
) error {
	secrets := &metav1.PartialObjectMetadataList{}
	secrets.SetGroupVersionKind(schema.GroupVersion{Version: "v1"}.WithKind("SecretList"))
	if err := reader.List(
		ctx,
		secrets,
		client.InNamespace(config2.GetUserSystemNamespace()),
		client.MatchingFields{v1.ServiceAccountNameKey: userName},
	); err != nil {
		return fmt.Errorf("failed to list legacy bound token secrets: %w", err)
	}
	if keepSecretName == "" {
		return errors.New("keep secret name is empty")
	}
	for i := range secrets.Items {
		secret := &secrets.Items[i]
		if secret.Name == "" || secret.Name == keepSecretName {
			continue
		}
		if secret.Annotations == nil || secret.Annotations[v1.ServiceAccountNameKey] != userName {
			continue
		}
		deleteTarget := &v1.Secret{ObjectMeta: metav1.ObjectMeta{
			Name: secret.Name, Namespace: secret.Namespace,
		}}
		if err := writer.Delete(ctx, deleteTarget); err != nil && !apierrors.IsNotFound(err) {
			return fmt.Errorf("failed to delete legacy bound token secret %s: %w", secret.Name, err)
		}
	}
	return nil
}

func (sac *ServiceAccountConfig) requestToken(
	ctx context.Context,
	config *rest.Config,
	boundSecret *v1.Secret,
) (*authenticationv1.TokenRequest, error) {
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	tokenRequest, err := clientset.CoreV1().
		ServiceAccounts(sac.namespace).
		CreateToken(ctx, sac.user, &authenticationv1.TokenRequest{
			Spec: authenticationv1.TokenRequestSpec{
				ExpirationSeconds: ptr.To(int64(sac.tokenRequestExpirationSeconds())),
				BoundObjectRef: &authenticationv1.BoundObjectReference{
					Kind:       "Secret",
					APIVersion: "v1",
					Name:       boundSecret.Name,
					UID:        boundSecret.UID,
				},
			},
		}, metav1.CreateOptions{})
	if err != nil {
		return nil, err
	}
	if tokenRequest.Status.Token == "" {
		return nil, fmt.Errorf(
			"token request returned empty token for serviceaccount %s/%s",
			sac.namespace,
			sac.user,
		)
	}
	return tokenRequest, nil
}

func (sac *ServiceAccountConfig) tokenRequestExpirationSeconds() int32 {
	return userv1.NormalizeCSRExpirationSeconds(sac.expirationSeconds)
}

func TokenSecretName(name string) string {
	return "sealos-token-" + name
}

func (sac *ServiceAccountConfig) generateSecretName() string {
	if sac.secretName != "" {
		return sac.secretName
	}
	if !sac.forceNewSecret &&
		sac.sa != nil &&
		len(sac.sa.Secrets) > 0 &&
		sac.sa.Secrets[0].Name != "" {
		return sac.sa.Secrets[0].Name
	}
	return "sealos-token-" + sac.user + "-" + GetRandomString(5)
}

func GetRandomString(n int) string {
	randBytes := make([]byte, n/2)
	if _, err := rand.Read(randBytes); err != nil {
		return ""
	}
	return hex.EncodeToString(randBytes)
}

func (sac *ServiceAccountConfig) generatorKubeConfig(
	cfg *rest.Config,
	token string,
) (*api.Config, error) {
	// make sure cadata is loaded into config under incluster mode
	if err := rest.LoadTLSFiles(cfg); err != nil {
		return nil, err
	}
	ctx := fmt.Sprintf("%s@%s", sac.user, sac.clusterName)
	config := &api.Config{
		Clusters: map[string]*api.Cluster{
			sac.clusterName: {
				Server:                   GetKubernetesHost(cfg),
				CertificateAuthorityData: cfg.CAData,
			},
		},
		Contexts: map[string]*api.Context{
			ctx: {
				Cluster:   sac.clusterName,
				AuthInfo:  sac.user,
				Namespace: config2.GetUsersNamespace(sac.user),
			},
		},
		AuthInfos: map[string]*api.AuthInfo{
			sac.user: {
				Token: token,
			},
		},
		CurrentContext: ctx,
	}
	return config, nil
}
