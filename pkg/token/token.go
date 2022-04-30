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

package token

import (
	"encoding/json"
	"fmt"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	v1 "github.com/labring/sealos/pkg/token/bootstraptoken/v1"

	"github.com/labring/sealos/pkg/utils/exec"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/yaml"
	"k8s.io/apimachinery/pkg/util/sets"
)

type Token struct {
	JoinToken                string       `json:"joinToken,omitempty"`
	DiscoveryTokenCaCertHash []string     `json:"discoveryTokenCaCertHash,omitempty"`
	CertificateKey           string       `json:"certificateKey,omitempty"`
	Expires                  *metav1.Time `json:"expires,omitempty"`
}

const defaultAdminConf = "/etc/kubernetes/admin.conf"

func Default() (*Token, error) {
	token := &Token{}
	if _, ok := exec.CheckCmdIsExist("kubeadm"); ok && file.IsExist(defaultAdminConf) {
		key, _ := CreateCertificateKey()
		token.CertificateKey = key
		const uploadCertTemplate = "kubeadm init phase upload-certs --upload-certs --certificate-key %s"
		_, _ = exec.RunBashCmd(fmt.Sprintf(uploadCertTemplate, key))
		tokens := ListToken()
		const tokenTemplate = "kubeadm token create --print-join-command --certificate-key %s"
		_, _ = exec.RunBashCmd(fmt.Sprintf(tokenTemplate, key))
		afterTokens := ListToken()
		diff := afterTokens.ToStrings().Difference(tokens.ToStrings())
		if diff.Len() == 1 {
			token.JoinToken = diff.List()[0]
			hashs, err := discoveryTokenCaCertHash(defaultAdminConf)
			if err != nil {
				return nil, err
			}
			token.DiscoveryTokenCaCertHash = hashs
			for _, t := range afterTokens {
				if t.Token.String() == token.JoinToken {
					token.Expires = t.Expires
					break
				}
			}
			return token, nil
		}
		return nil, fmt.Errorf("token list found more than one")
	}

	return nil, fmt.Errorf("kubeadm command not found or /etc/kubernetes/admin.conf not exist")
}

func ListToken() BootstrapTokens {
	const tokenListShell = "kubeadm token list -o yaml"
	data, _ := exec.RunBashCmd(tokenListShell)
	return processTokenList(data)
}

func processTokenList(data string) BootstrapTokens {
	var slice []v1.BootstrapToken
	if data != "" {
		jsons := yaml.ToJSON([]byte(data))
		for _, j := range jsons {
			var to v1.BootstrapToken
			_ = json.Unmarshal([]byte(j), &to)
			slice = append(slice, to)
		}
	}
	var result []v1.BootstrapToken
	for _, token := range slice {
		if token.Expires != nil {
			t := time.Now().Unix()
			ex := token.Expires.Time.Unix()
			if ex < t {
				continue
			}
			if len(token.Usages) == 0 || len(token.Groups) == 0 {
				continue
			}
		}
		result = append(result, token)
	}
	return result
}

type BootstrapTokens []v1.BootstrapToken

func (c BootstrapTokens) ToStrings() sets.String {
	s := sets.NewString()
	for _, token := range c {
		s.Insert(token.Token.String())
	}
	return s
}
