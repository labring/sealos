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
	"fmt"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	config2 "github.com/labring/sealos/controllers/user/controllers/helper/config"
	authenticationv1 "k8s.io/api/authentication/v1"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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
	if err := sac.applyServiceAccount(config, client); err != nil {
		return nil, metav1.Time{}, fmt.Errorf("failed to apply service account error: %w", err)
	}
	tokenRequest, err := sac.requestToken(ctx, config)
	if err != nil {
		return nil, metav1.Time{}, fmt.Errorf("failed to fetch token: %w", err)
	}
	cfg, err := sac.generatorKubeConfig(config, tokenRequest.Status.Token)
	if err != nil {
		return nil, metav1.Time{}, fmt.Errorf("failed to generate kube config: %w", err)
	}
	return cfg, tokenRequest.Status.ExpirationTimestamp, nil
}

func (sac *ServiceAccountConfig) applyServiceAccount(_ *rest.Config, client client.Client) error {
	if sac.sa != nil {
		return nil
	}
	sa := &v1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name:      sac.user,
			Namespace: sac.namespace,
		},
	}
	_, err := controllerutil.CreateOrUpdate(context.TODO(), client, sa, func() error {
		return nil
	})
	sac.sa = sa
	return err
}

func (sac *ServiceAccountConfig) requestToken(ctx context.Context, config *rest.Config) (*authenticationv1.TokenRequest, error) {
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	tokenRequest, err := clientset.CoreV1().
		ServiceAccounts(sac.namespace).
		CreateToken(ctx, sac.user, &authenticationv1.TokenRequest{
			Spec: authenticationv1.TokenRequestSpec{
				ExpirationSeconds: ptr.To(int64(sac.tokenRequestExpirationSeconds())),
			},
		}, metav1.CreateOptions{})
	if err != nil {
		return nil, err
	}
	if tokenRequest.Status.Token == "" {
		return nil, fmt.Errorf("token request returned empty token for serviceaccount %s/%s", sac.namespace, sac.user)
	}
	return tokenRequest, nil
}

func (sac *ServiceAccountConfig) tokenRequestExpirationSeconds() int32 {
	if sac.expirationSeconds < userv1.DefaultCSRExpirationSeconds {
		return userv1.DefaultCSRExpirationSeconds
	}
	return sac.expirationSeconds
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
