/*
Copyright 2017 The Kubernetes Authors.

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

package join

import (
	"github.com/fanux/sealos/pkg/utils/kubernetes/apis/kubeadm"
	"github.com/fanux/sealos/pkg/utils/kubernetes/copycerts"
	"github.com/fanux/sealos/pkg/utils/kubernetes/token"
	"github.com/pkg/errors"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	clientset "k8s.io/client-go/kubernetes"
	bootstraputil "k8s.io/cluster-bootstrap/token/util"
)

func CreateShortLivedBootstrapToken(client clientset.Interface, ttl *metav1.Duration) (*kubeadm.BootstrapTokenString, error) {
	tokenStr, err := bootstraputil.GenerateBootstrapToken()
	if err != nil {
		return nil, errors.Wrap(err, "error generator bootstrap bootstrapToken")
	}
	bootstrapToken, err := kubeadm.NewBootstrapTokenString(tokenStr)
	if err != nil {
		return nil, errors.Wrap(err, "error creating upload certs bootstrapToken")
	}
	btoken := kubeadm.BootstrapToken{
		Token:       bootstrapToken,
		Description: "Proxy for managing TTL for the sealos secret",
		TTL:         ttl,
		Usages:      []string{"authentication", "signing"},
		Groups:      []string{copycerts.NodeBootstrapTokenAuthGroup},
	}
	err = token.CreateNewTokens(client, btoken)
	if err != nil {
		return nil, err
	}
	return btoken.Token, nil
}
