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

	k8sErrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"

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

func CreateOrUpdateKubeConfig(uid string) error {
	client, err := kubernetes.NewKubernetesClient(conf.GlobalConfig.Kubeconfig, "")
	if err != nil {
		return err
	}

	resource := client.KubernetesDynamic().Resource(schema.GroupVersionResource{
		Group:    "user.sealos.io",
		Version:  "v1",
		Resource: "users",
	})
	user, err := resource.Get(context.Background(), uid, metav1.GetOptions{})
	if k8sErrors.IsNotFound(err) {
		_, err := resource.Create(context.TODO(), &unstructured.Unstructured{Object: map[string]interface{}{
			"apiVersion": "user.sealos.io/v1",
			"kind":       "User",
			"metadata": map[string]interface{}{
				"name": uid,
				"labels": map[string]interface{}{
					"updateTime": time.Now().Format("T2006-01-02T15-04-05"),
				},
			},
			"spec": map[string]interface{}{
				"csrExpirationSeconds": 1000000000,
			},
		}}, metav1.CreateOptions{})
		if err != nil {
			return err
		}
	} else if err != nil {
		return err
	} else {
		// To trigger controller reconcile
		user.Object["metadata"].(map[string]interface{})["labels"].(map[string]interface{})["updateTime"] = time.Now().Format("T2006-01-02T15-04-05")
		_, err = resource.Update(context.Background(), user, metav1.UpdateOptions{})
		if err != nil {
			return err
		}
	}
	return nil
}

func GetKubeConfig(uid string) (string, error) {
	client, err := kubernetes.NewKubernetesClient(conf.GlobalConfig.Kubeconfig, "")
	if err != nil {
		return "", err
	}

	resource := client.KubernetesDynamic().Resource(schema.GroupVersionResource{
		Group:    "user.sealos.io",
		Version:  "v1",
		Resource: "users",
	})
	user, err := resource.Get(context.Background(), uid, metav1.GetOptions{})
	if err != nil {
		return "", err
	}
	if user.Object["status"] == nil {
		return "", fmt.Errorf("status is empty, please wait for a while or check the health of user-controller")
	}
	status := user.Object["status"].(map[string]interface{})
	if kubeConfig, ok := status["kubeConfig"]; ok {
		return kubeConfig.(string), nil
	}
	return "", fmt.Errorf("there is no field named kubeConfig in status")
}
