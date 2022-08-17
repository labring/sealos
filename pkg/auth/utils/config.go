// Copyright © 2022 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package utils

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"math/big"
	"time"

	v1 "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"

	"github.com/labring/sealos/pkg/auth/conf"
	"github.com/labring/sealos/pkg/client-go/kubernetes"
)

func RandomHexStr(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func CreateJWTCertificateAndPrivateKey() (string, string, error) {
	// Generate RSA key.
	key, err := rsa.GenerateKey(rand.Reader, 4096)
	if err != nil {
		return "", "", err
	}

	// Encode private key to PKCS#1 ASN.1 PEM.
	privateKeyPem := pem.EncodeToMemory(
		&pem.Block{
			Type:  "PRIVATE KEY",
			Bytes: x509.MarshalPKCS1PrivateKey(key),
		},
	)

	tml := x509.Certificate{
		NotBefore: time.Now(),
		NotAfter:  time.Now().AddDate(99, 0, 0),
		// you have to generate a different serial number each execution
		SerialNumber: big.NewInt(123456),
		Subject: pkix.Name{
			CommonName:   "Sealos Desktop Cert",
			Organization: []string{"Sealos"},
		},
		BasicConstraintsValid: true,
	}
	cert, err := x509.CreateCertificate(rand.Reader, &tml, &tml, &key.PublicKey, key)
	if err != nil {
		return "", "", err
	}

	// Generate a pem block with the certificate
	certPem := pem.EncodeToMemory(&pem.Block{
		Type:  "CERTIFICATE",
		Bytes: cert,
	})

	return string(certPem), string(privateKeyPem), nil
}

func GenerateKubeConfig(username string) (string, error) {
	client, err := kubernetes.NewKubernetesClient(conf.GlobalConfig.Kubeconfig, "")
	if err != nil {
		return "", err
	}
	if _, err = ApplyServiceAccount(client, username); err != nil {
		return "", err
	}
	if _, err = ApplyClusterRoleBinding(client, username); err != nil {
		return "", err
	}
	if _, err = ApplySecret(client, username); err != nil {
		return "", err
	}

	var tokenSecret *v1.Secret
	// Wait for kubernetes to fill token into the secret
	for i := 0; i < 10; i++ {
		tokenSecret, err = client.Kubernetes().CoreV1().Secrets("sealos").Get(context.TODO(), fmt.Sprintf("%s-%s", username, "token"), metaV1.GetOptions{})
		if err != nil {
			return "", err
		}
		if _, filled := tokenSecret.Data["token"]; filled {
			break
		}
		time.Sleep(time.Second)
	}
	if _, filled := tokenSecret.Data["token"]; !filled {
		return "", fmt.Errorf("failed to get token in Secret %s-%s", username, "token")
	}

	ctx := fmt.Sprintf("%s@%s", username, "kubernetes")
	if err != nil {
		return "", err
	}

	config := api.Config{
		Clusters: map[string]*api.Cluster{
			"kubernetes": {
				Server:                   "https://apiserver.cluster.local:6443",
				CertificateAuthorityData: client.Config().TLSClientConfig.CAData,
			},
		},
		Contexts: map[string]*api.Context{
			ctx: {
				Cluster:  "kubernetes",
				AuthInfo: username,
			},
		},
		AuthInfos: map[string]*api.AuthInfo{
			username: {
				Token: string(tokenSecret.Data["token"]),
			},
		},
		CurrentContext: ctx,
	}

	content, err := clientcmd.Write(config)
	if err != nil {
		return "", fmt.Errorf("write kubeconfig failed %s", err)
	}

	return string(content), nil
}
