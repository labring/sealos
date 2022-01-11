/*
Copyright 2019 The Kubernetes Authors.

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

package copycerts

import (
	"context"
	"encoding/hex"
	"fmt"
	"io/ioutil"
	"os"
	"path"
	"strings"

	"github.com/fanux/sealos/pkg/utils/kubernetes/apiclient"
	"github.com/fanux/sealos/pkg/utils/kubernetes/apis/kubeadm"
	cryptoutil "github.com/fanux/sealos/pkg/utils/kubernetes/crypto"
	"github.com/fanux/sealos/pkg/utils/logger"

	"github.com/pkg/errors"

	v1 "k8s.io/api/core/v1"
	rbac "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	clientset "k8s.io/client-go/kubernetes"
	certutil "k8s.io/client-go/util/cert"
	keyutil "k8s.io/client-go/util/keyutil"
	bootstraputil "k8s.io/cluster-bootstrap/token/util"
)

const (
	externalEtcdCA     = "external-etcd-ca.crt"
	externalEtcdCert   = "external-etcd.crt"
	externalEtcdKey    = "external-etcd.key"
	CertificateKeySize = 32
	KubeadmCertsSecret = "kubeadm-certs"
	// NodeBootstrapTokenAuthGroup specifies which group a Node Bootstrap Token should be authenticated in
	NodeBootstrapTokenAuthGroup = "system:bootstrappers:kubeadm:default-node-token"
	// CACertName defines certificate name
	CACertName = "ca.crt"
	// CAKeyName defines certificate name
	CAKeyName = "ca.key"
	// EtcdCACertName defines etcd's CA certificate name
	EtcdCACertName = "etcd/ca.crt"
	// EtcdCAKeyName defines etcd's CA key name
	EtcdCAKeyName = "etcd/ca.key"
	// ServiceAccountPublicKeyName defines SA public key base name
	ServiceAccountPublicKeyName = "sa.pub"
	// ServiceAccountPrivateKeyName defines SA private key base name
	ServiceAccountPrivateKeyName = "sa.key"

	// FrontProxyCACertName defines front proxy CA certificate name
	FrontProxyCACertName = "front-proxy-ca.crt"
	// FrontProxyCAKeyName defines front proxy CA key name
	FrontProxyCAKeyName = "front-proxy-ca.key"
)

var (
	// KubeadmCertsClusterRoleName sets the name for the ClusterRole that allows
	// the bootstrap tokens to access the kubeadm-certs Secret during the join of a new control-plane
	KubeadmCertsClusterRoleName = fmt.Sprintf("kubeadm:%s", KubeadmCertsSecret)
)

//CreateCertificateKey returns a cryptographically secure random key
func CreateCertificateKey() (string, error) {
	randBytes, err := cryptoutil.CreateRandBytes(CertificateKeySize)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(randBytes), nil
}

//UploadCerts save certs needs to join a new control-plane on kubeadm-certs sercret.
func UploadCerts(client clientset.Interface, cfg *kubeadm.ClusterConfiguration, key, tokenID string) error {
	fmt.Printf("[upload-certs] Storing the certificates in Secret %q in the %q Namespace\n", KubeadmCertsSecret, metav1.NamespaceSystem)
	decodedKey, err := hex.DecodeString(key)
	if err != nil {
		return errors.Wrap(err, "error decoding certificate key")
	}

	secretData, err := getDataFromDisk(cfg, decodedKey)
	if err != nil {
		return err
	}
	ref, err := getSecretOwnerRef(client, tokenID)
	if err != nil {
		return err
	}

	err = apiclient.CreateOrUpdateSecret(client, &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:            KubeadmCertsSecret,
			Namespace:       metav1.NamespaceSystem,
			OwnerReferences: ref,
		},
		Data: secretData,
	})
	if err != nil {
		return err
	}

	return createRBAC(client)
}

func createRBAC(client clientset.Interface) error {
	err := apiclient.CreateOrUpdateRole(client, &rbac.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      KubeadmCertsClusterRoleName,
			Namespace: metav1.NamespaceSystem,
		},
		Rules: []rbac.PolicyRule{
			{
				Verbs:         []string{"get"},
				APIGroups:     []string{""},
				Resources:     []string{"secrets"},
				ResourceNames: []string{KubeadmCertsSecret},
			},
		},
	})
	if err != nil {
		return err
	}

	return apiclient.CreateOrUpdateRoleBinding(client, &rbac.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      KubeadmCertsClusterRoleName,
			Namespace: metav1.NamespaceSystem,
		},
		RoleRef: rbac.RoleRef{
			APIGroup: rbac.GroupName,
			Kind:     "Role",
			Name:     KubeadmCertsClusterRoleName,
		},
		Subjects: []rbac.Subject{
			{
				Kind: rbac.GroupKind,
				Name: NodeBootstrapTokenAuthGroup,
			},
		},
	})
}

func getSecretOwnerRef(client clientset.Interface, tokenID string) ([]metav1.OwnerReference, error) {
	secretName := bootstraputil.BootstrapTokenSecretName(tokenID)
	secret, err := client.CoreV1().Secrets(metav1.NamespaceSystem).Get(context.TODO(), secretName, metav1.GetOptions{})
	if err != nil {
		return nil, errors.Wrap(err, "error to get token reference")
	}

	gvk := schema.GroupVersionKind{Version: "v1", Kind: "Secret"}
	ref := metav1.NewControllerRef(secret, gvk)
	return []metav1.OwnerReference{*ref}, nil
}

func loadAndEncryptCert(certPath string, key []byte) ([]byte, error) {
	cert, err := ioutil.ReadFile(certPath)
	if err != nil {
		return nil, err
	}
	return cryptoutil.EncryptBytes(cert, key)
}

func certsToTransfer(cfg *kubeadm.ClusterConfiguration) map[string]string {
	certsDir := cfg.CertificatesDir
	certs := map[string]string{
		CACertName:                   path.Join(certsDir, CACertName),
		CAKeyName:                    path.Join(certsDir, CAKeyName),
		FrontProxyCACertName:         path.Join(certsDir, FrontProxyCACertName),
		FrontProxyCAKeyName:          path.Join(certsDir, FrontProxyCAKeyName),
		ServiceAccountPublicKeyName:  path.Join(certsDir, ServiceAccountPublicKeyName),
		ServiceAccountPrivateKeyName: path.Join(certsDir, ServiceAccountPrivateKeyName),
	}

	if cfg.ExternalEtcd == nil {
		certs[EtcdCACertName] = path.Join(certsDir, EtcdCACertName)
		certs[EtcdCAKeyName] = path.Join(certsDir, EtcdCAKeyName)
	} else {
		certs[externalEtcdCA] = cfg.ExternalEtcd.CAFile
		certs[externalEtcdCert] = cfg.ExternalEtcd.CertFile
		certs[externalEtcdKey] = cfg.ExternalEtcd.KeyFile
	}

	return certs
}

func getDataFromDisk(cfg *kubeadm.ClusterConfiguration, key []byte) (map[string][]byte, error) {
	secretData := map[string][]byte{}
	for certName, certPath := range certsToTransfer(cfg) {
		cert, err := loadAndEncryptCert(certPath, key)
		if err == nil || os.IsNotExist(err) {
			secretData[certOrKeyNameToSecretName(certName)] = cert
		} else {
			return nil, err
		}
	}
	return secretData, nil
}

// DownloadCerts downloads the certificates needed to join a new control plane.
func DownloadCerts(client clientset.Interface, cfg *kubeadm.ClusterConfiguration, key string) error {
	fmt.Printf("[download-certs] Downloading the certificates in Secret %q in the %q Namespace\n", KubeadmCertsSecret, metav1.NamespaceSystem)

	decodedKey, err := hex.DecodeString(key)
	if err != nil {
		return errors.Wrap(err, "error decoding certificate key")
	}

	secret, err := getSecret(client)
	if err != nil {
		return errors.Wrap(err, "error downloading the secret")
	}

	secretData, err := getDataFromSecret(secret, decodedKey)
	if err != nil {
		return errors.Wrap(err, "error decoding secret data with provided key")
	}

	for certOrKeyName, certOrKeyPath := range certsToTransfer(cfg) {
		certOrKeyData, found := secretData[certOrKeyNameToSecretName(certOrKeyName)]
		if !found {
			return errors.Errorf("the Secret does not include the required certificate or key - name: %s, path: %s", certOrKeyName, certOrKeyPath)
		}
		if len(certOrKeyData) == 0 {
			logger.Info("[download-certs] Not saving %q to disk, since it is empty in the %q Secret\n", certOrKeyName, KubeadmCertsSecret)
			continue
		}
		if err := writeCertOrKey(certOrKeyPath, certOrKeyData); err != nil {
			return err
		}
	}

	return nil
}

func writeCertOrKey(certOrKeyPath string, certOrKeyData []byte) error {
	if _, err := keyutil.ParsePublicKeysPEM(certOrKeyData); err == nil {
		return keyutil.WriteKey(certOrKeyPath, certOrKeyData)
	} else if _, err := certutil.ParseCertsPEM(certOrKeyData); err == nil {
		return certutil.WriteCert(certOrKeyPath, certOrKeyData)
	}
	return errors.New("unknown data found in Secret entry")
}

func getSecret(client clientset.Interface) (*v1.Secret, error) {
	secret, err := client.CoreV1().Secrets(metav1.NamespaceSystem).Get(context.TODO(), KubeadmCertsSecret, metav1.GetOptions{})
	if err != nil {
		if apierrors.IsNotFound(err) {
			return nil, errors.Errorf("Secret %q was not found in the %q Namespace. This Secret might have expired. Please, run `kubeadm init phase upload-certs --upload-certs` on a control plane to generate a new one", KubeadmCertsSecret, metav1.NamespaceSystem)
		}
		return nil, err
	}
	return secret, nil
}

func getDataFromSecret(secret *v1.Secret, key []byte) (map[string][]byte, error) {
	secretData := map[string][]byte{}
	for secretName, encryptedSecret := range secret.Data {
		// In some cases the secret might have empty data if the secrets were not present on disk
		// when uploading. This can specially happen with external insecure etcd (no certs)
		if len(encryptedSecret) > 0 {
			cert, err := cryptoutil.DecryptBytes(encryptedSecret, key)
			if err != nil {
				// If any of the decrypt operations fail do not return a partial result,
				// return an empty result immediately
				return map[string][]byte{}, err
			}
			secretData[secretName] = cert
		} else {
			secretData[secretName] = []byte{}
		}
	}
	return secretData, nil
}

func certOrKeyNameToSecretName(certOrKeyName string) string {
	return strings.Replace(certOrKeyName, "/", "-", -1)
}
