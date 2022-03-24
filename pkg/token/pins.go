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
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"strings"

	"github.com/pkg/errors"
	"k8s.io/client-go/tools/clientcmd"
	clientcmdapi "k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/client-go/util/cert"
)

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
			return nil, errors.Wrap(err, "failed to parse CA certificate from kubeconfig")
		}
	} else if clusterConfig.CertificateAuthority != "" {
		caCerts, err = cert.CertsFromFile(clusterConfig.CertificateAuthority)
		if err != nil {
			return nil, errors.Wrap(err, "failed to load CA certificate referenced by kubeconfig")
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

// CreateRandBytes returns a cryptographically secure slice of random bytes with a given size
func CreateRandBytes(size uint32) ([]byte, error) {
	bytes := make([]byte, size)
	if _, err := rand.Read(bytes); err != nil {
		return nil, err
	}
	return bytes, nil
}

const (
	CertificateKeySize = 32
)

//CreateCertificateKey returns a cryptographically secure random key
func CreateCertificateKey() (string, error) {
	randBytes, err := CreateRandBytes(CertificateKeySize)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(randBytes), nil
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
