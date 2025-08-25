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
	"strconv"
	"time"

	config2 "github.com/labring/sealos/controllers/user/controllers/helper/config"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd/api"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

func (sac *ServiceAccountConfig) Apply(config *rest.Config, client client.Client) (*api.Config, error) {
	if err := sac.applyServiceAccount(config, client); err != nil {
		return nil, err
	}
	if err := sac.applySecret(config, client); err != nil {
		return nil, err
	}
	token, err := sac.fetchToken(client)
	if err == nil {
		if cfg, err := sac.generatorKubeConfig(config, token); err == nil {
			return cfg, nil
		}
	}
	return nil, err
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
		if len(sa.Secrets) == 0 {
			sa.Secrets = []v1.ObjectReference{
				{
					Name: sac.getSecretName(),
				},
			}
		}
		return nil
	})
	sac.secretName = sa.Secrets[0].Name
	return err
}

func (sac *ServiceAccountConfig) applySecret(_ *rest.Config, client client.Client) error {
	if sac.sa != nil {
		return nil
	}
	secret := &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      sac.secretName,
			Namespace: sac.namespace,
		},
	}
	_, err := controllerutil.CreateOrUpdate(context.TODO(), client, secret, func() error {
		if secret.Annotations == nil {
			secret.Annotations = make(map[string]string, 0)
		}
		secret.Type = v1.SecretTypeServiceAccountToken
		secret.Annotations[v1.ServiceAccountNameKey] = sac.user
		secret.Annotations["sealos.io/user.expirationSeconds"] = strconv.Itoa(int(sac.expirationSeconds))
		return nil
	})
	sac.sa = &v1.ServiceAccount{}
	sac.sa.Name = sac.user
	sac.sa.Namespace = sac.namespace
	return err
}

func (sac *ServiceAccountConfig) getSecretName() string {
	if sac.sa != nil {
		return sac.sa.Secrets[0].Name
	}
	return SecretName(sac.user)
}

func (sac *ServiceAccountConfig) fetchToken(cli client.Client) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	defer cancel()
	start := time.Now()
	for {
		select {
		case <-time.After(5 * time.Millisecond):
			sa := sac.sa
			if err := cli.Get(ctx, client.ObjectKeyFromObject(sa), sa); err != nil {
				return "", err
			}
			if len(sa.Secrets) == 0 {
				continue
			}
			secret := &v1.Secret{}
			secret.Name = sa.Secrets[0].Name
			secret.Namespace = sac.sa.Namespace
			if err := cli.Get(ctx, client.ObjectKeyFromObject(secret), secret); err != nil {
				continue
			}
			if secret.Data != nil && secret.Data[v1.ServiceAccountTokenKey] != nil {
				dis := time.Since(start).Milliseconds()
				defaultLog.Info("The serviceAccount secret is ready.", "secretName", secret.Name, "using Milliseconds", dis)
				return string(secret.Data[v1.ServiceAccountTokenKey]), nil
			}
		case <-ctx.Done():
			defaultLog.Error(ctx.Err(), "context get secrets time out")
			return "", ctx.Err()
		}
	}
}

func (sac *ServiceAccountConfig) generatorKubeConfig(cfg *rest.Config, token string) (*api.Config, error) {
	// make sure cadata is loaded into config under incluster mode
	if err := rest.LoadTLSFiles(cfg); err != nil {
		return nil, err
	}
	ctx := fmt.Sprintf("%s@%s", sac.user, sac.clusterName)
	config := &api.Config{
		Clusters: map[string]*api.Cluster{
			sac.clusterName: {
				Server:                   GetKubernetesHost(cfg),
				CertificateAuthorityData: cfg.TLSClientConfig.CAData,
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
