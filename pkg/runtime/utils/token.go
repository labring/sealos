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

package utils

import (
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"k8s.io/apimachinery/pkg/util/sets"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/client-go/util/cert"
	v1 "k8s.io/kubernetes/cmd/kubeadm/app/apis/bootstraptoken/v1"

	"github.com/labring/sealos/pkg/runtime/kubernetes/types"
	"github.com/labring/sealos/pkg/utils/exec"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/rand"
	"github.com/labring/sealos/pkg/utils/yaml"
)

const defaultAdminConf = "/etc/kubernetes/admin.conf"

func GenerateToken(config, certificateKey string) (*types.Token, error) {
	token := &types.Token{}
	if _, ok := exec.CheckCmdIsExist("kubeadm"); ok && file.IsExist(defaultAdminConf) {
		key, _ := rand.CreateCertificateKey()
		if certificateKey != "" {
			key = certificateKey
		}
		token.CertificateKey = key
		uploadCertTemplate := fmt.Sprintf("kubeadm init phase upload-certs --upload-certs --certificate-key %s", key)
		if config != "" {
			uploadCertTemplate = fmt.Sprintf("kubeadm init phase upload-certs --config %s --upload-certs", config)
		}
		logger.Debug("token uploadCertTemplate cmd: %s", uploadCertTemplate)
		_, _ = exec.RunBashCmd(uploadCertTemplate)
		tokens := ListToken()
		const tokenTemplate = "kubeadm token create --print-join-command --certificate-key %s --ttl 2h"
		logger.Debug("token tokenTemplate cmd: %s", tokenTemplate)
		_, _ = exec.RunBashCmd(fmt.Sprintf(tokenTemplate, key))
		afterTokens := ListToken()
		diff := afterTokens.ToStrings().Difference(tokens.ToStrings())
		if diff.Len() == 1 {
			token.JoinToken = diff.UnsortedList()[0]
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

func (c BootstrapTokens) ToStrings() sets.Set[string] {
	s := sets.New[string]()
	for _, token := range c {
		s.Insert(token.Token.String())
	}
	return s
}

func discoveryTokenCaCertHash(adminPath string) ([]string, error) {
	tlsBootstrapCfg, err := clientcmd.LoadFromFile(adminPath)
	if err != nil {
		return nil, err
	}
	// load the default cluster config
	clusterConfig := GetClusterFromKubeConfig(tlsBootstrapCfg)
	if clusterConfig == nil {
		return nil, errors.New("failed to get default cluster config")
	}

	// load CA certificates from the kubeconfig (either from PEM data or by file path)
	var caCerts []*x509.Certificate
	if clusterConfig.CertificateAuthorityData != nil {
		caCerts, err = cert.ParseCertsPEM(clusterConfig.CertificateAuthorityData)
		if err != nil {
			return nil, fmt.Errorf("failed to parse CA certificate from kubeconfig: %w", err)
		}
	} else if clusterConfig.CertificateAuthority != "" {
		caCerts, err = cert.CertsFromFile(clusterConfig.CertificateAuthority)
		if err != nil {
			return nil, fmt.Errorf("failed to load CA certificate referenced by kubeconfig: %w", err)
		}
	} else {
		return nil, errors.New("no CA certificates found in kubeconfig")
	}

	// hash all the CA certs and include their public key pins as trusted values
	publicKeyPins := make([]string, 0, len(caCerts))
	for _, caCert := range caCerts {
		publicKeyPins = append(publicKeyPins, Hash(caCert))
	}
	return publicKeyPins, nil
}

// GetClusterFromKubeConfig returns the default Infra of the specified KubeConfig
func GetClusterFromKubeConfig(config *clientcmdapi.Config) *clientcmdapi.Cluster {
	// If there is an unnamed cluster object, use it
	if config.Clusters[""] != nil {
		return config.Clusters[""]
	}
	if config.Contexts[config.CurrentContext] != nil {
		return config.Clusters[config.Contexts[config.CurrentContext].Cluster]
	}
	return nil
}

const (
	// formatSHA256 is the prefix for pins that are full-length SHA-256 hashes encoded in base 16 (hex)
	formatSHA256 = "sha256"
)

// Hash calculates the SHA-256 hash of the Subject Public Key Information (SPKI)
// object in an x509 certificate (in DER encoding). It returns the full hash as a
// hex encoded string (suitable for passing to Set.Allow).
func Hash(certificate *x509.Certificate) string {
	spkiHash := sha256.Sum256(certificate.RawSubjectPublicKeyInfo)
	return formatSHA256 + ":" + strings.ToLower(hex.EncodeToString(spkiHash[:]))
}
