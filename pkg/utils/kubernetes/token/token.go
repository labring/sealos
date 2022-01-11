/*
Copyright 2021 cuisongliu@qq.com.

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

package token

import (
	"context"

	"github.com/fanux/sealos/pkg/utils/kubernetes/apiclient"
	"github.com/fanux/sealos/pkg/utils/kubernetes/apis/kubeadm"

	"github.com/pkg/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	clientset "k8s.io/client-go/kubernetes"
	bootstraputil "k8s.io/cluster-bootstrap/token/util"
)

// CreateNewTokens tries to create a token and fails if one with the same ID already exists
func CreateNewTokens(client clientset.Interface, token kubeadm.BootstrapToken) error {
	return UpdateOrCreateTokens(client, true, token)
}

// UpdateOrCreateTokens attempts to update a token with the given ID, or create if it does not already exist.
func UpdateOrCreateTokens(client clientset.Interface, failIfExists bool, token kubeadm.BootstrapToken) error {
	secretName := bootstraputil.BootstrapTokenSecretName(token.Token.ID)
	secret, err := client.CoreV1().Secrets(metav1.NamespaceSystem).Get(context.TODO(), secretName, metav1.GetOptions{})
	if secret != nil && err == nil && failIfExists {
		return errors.Errorf("a token with id %q already exists", token.Token.ID)
	}

	updatedOrNewSecret := token.ToSecret()
	// Try to create or update the token with an exponential backoff
	err = apiclient.TryRunCommand(func() error {
		if err := apiclient.CreateOrUpdateSecret(client, updatedOrNewSecret); err != nil {
			return errors.Wrapf(err, "failed to create or update bootstrap token with name %s", secretName)
		}
		return nil
	}, 5)

	if err != nil {
		return err
	}
	return nil
}
