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

package helper

import (
	"context"
	"fmt"
	"strconv"
	"time"

	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd/api"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

type ServiceAccount struct {
	*Config
}

func (sac *ServiceAccount) KubeConfig(config *rest.Config, client client.Client) (*api.Config, error) {
	if err := sac.applyServiceAccount(config, client); err != nil {
		return nil, err
	}
	if err := sac.applySecret(config, client); err != nil {
		return nil, err
	}
	token, err := sac.fetchToken(config)
	if err == nil {
		if cfg, err := sac.generatorKubeConfig(config, token); err == nil {
			return cfg, nil
		}
	}
	return nil, err
}

func (sac *ServiceAccount) applyServiceAccount(config *rest.Config, client client.Client) error {
	sa := &v1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name:      sac.User,
			Namespace: sac.ServiceAccountNamespace,
		},
	}
	_, err := controllerutil.CreateOrUpdate(context.TODO(), client, sa, func() error {
		return nil
	})
	return err
}

func (sac *ServiceAccount) applySecret(config *rest.Config, client client.Client) error {
	secret := &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      sac.getSecretName(),
			Namespace: sac.ServiceAccountNamespace,
		},
	}
	_, err := controllerutil.CreateOrUpdate(context.TODO(), client, secret, func() error {
		if secret.Annotations == nil {
			secret.Annotations = make(map[string]string, 0)
		}
		secret.Type = v1.SecretTypeServiceAccountToken
		secret.Annotations[v1.ServiceAccountNameKey] = sac.User
		secret.Annotations["sealos.io/user.expirationSeconds"] = strconv.Itoa(int(sac.ExpirationSeconds))
		return nil
	})
	return err
}

func (sac *ServiceAccount) getSecretName() string {
	return fmt.Sprintf("%s-%s", sac.User, "generator-token")
}
func (sac *ServiceAccount) fetchToken(config *rest.Config) (string, error) {
	cl, err := client.NewWithWatch(config, client.Options{})
	if err != nil {
		return "", err
	}
	secretList := &v1.SecretList{}
	w, err := cl.Watch(context.TODO(), secretList, client.InNamespace(sac.ServiceAccountNamespace))
	if err != nil {
		return "", err
	}
	start := time.Now()
	for {
		select {
		case <-time.After(time.Second * 10):
			return "", errors.NewBadRequest("The secret is not ready.")
		case event := <-w.ResultChan():
			if event.Type == watch.Modified || event.Type == watch.Added {
				secret := event.Object.(*v1.Secret)
				secretName := sac.getSecretName()
				if secret.Name == secretName && secret.Data != nil && secret.Data[v1.ServiceAccountTokenKey] != nil {
					dis := time.Since(start).Milliseconds()
					defaultLog.Info("The serviceAccount secret is ready.", "secretName", secretName, "using Milliseconds", dis)
					return string(secret.Data[v1.ServiceAccountTokenKey]), nil
				}
			}
		}
	}
}

func (sac *ServiceAccount) generatorKubeConfig(cfg *rest.Config, token string) (*api.Config, error) {
	// make sure cadata is loaded into config under incluster mode
	if err := rest.LoadTLSFiles(cfg); err != nil {
		return nil, err
	}
	ctx := fmt.Sprintf("%s@%s", sac.User, sac.ClusterName)
	config := &api.Config{
		Clusters: map[string]*api.Cluster{
			sac.ClusterName: {
				Server:                   GetKubernetesHost(cfg),
				CertificateAuthorityData: cfg.TLSClientConfig.CAData,
			},
		},
		Contexts: map[string]*api.Context{
			ctx: {
				Cluster:   sac.ClusterName,
				AuthInfo:  sac.User,
				Namespace: GetUsersNamespace(sac.User),
			},
		},
		AuthInfos: map[string]*api.AuthInfo{
			sac.User: {
				Token: token,
			},
		},
		CurrentContext: ctx,
	}
	return config, nil
}
