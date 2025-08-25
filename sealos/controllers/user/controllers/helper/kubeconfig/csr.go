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
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"net"
	"time"

	config2 "github.com/labring/sealos/controllers/user/controllers/helper/config"

	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/util/retry"

	csrv1 "k8s.io/api/certificates/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd/api"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// newPrivateKey creates an RSA private key
func newPrivateKey(keyType x509.PublicKeyAlgorithm) (crypto.Signer, error) {
	if keyType == x509.ECDSA {
		return ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	}

	return rsa.GenerateKey(rand.Reader, 2048)
}

func (csr *CsrConfig) newSignedToCsrKey() (csrData, keyPEM []byte, err error) {
	key, err := newPrivateKey(x509.RSA)
	if err != nil {
		return nil, nil, fmt.Errorf("new signed private failed %s", err)
	}
	pk := x509.MarshalPKCS1PrivateKey(key.(*rsa.PrivateKey))
	keyPEM = pem.EncodeToMemory(&pem.Block{
		Type: "RSA PRIVATE KEY", Bytes: pk,
	})
	_, csrObj, err := csr.generateCSR(key)
	if err != nil {
		return nil, nil, fmt.Errorf("new signed csr failed %s", err)
	}
	csrData = pem.EncodeToMemory(&pem.Block{
		Type: "CERTIFICATE REQUEST", Bytes: csrObj,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("new signed csr failed %s", err)
	}

	return
}

func (csr *CsrConfig) Apply(config *rest.Config, client client.Client) (*api.Config, error) {
	csrKey, key, err := csr.newSignedToCsrKey()
	if err != nil {
		return nil, err
	}
	// make sure cadata is loaded into config under incluster mode
	if err = rest.LoadTLSFiles(config); err != nil {
		return nil, err
	}
	ca := config.CAData
	csr.ctxCAKey = ca
	csr.ctxTLSKey = key
	csr.ctxTLSCsr = csrKey
	if err = csr.updateCsr(config, client); err != nil {
		return nil, err
	}
	ctx := fmt.Sprintf("%s@%s", csr.user, csr.clusterName)
	return &api.Config{
		Clusters: map[string]*api.Cluster{
			csr.clusterName: {
				Server:                   GetKubernetesHost(config),
				CertificateAuthorityData: ca,
			},
		},
		Contexts: map[string]*api.Context{
			ctx: {
				Cluster:   csr.clusterName,
				AuthInfo:  csr.user,
				Namespace: config2.GetUsersNamespace(csr.user),
			},
		},
		AuthInfos: map[string]*api.AuthInfo{
			csr.user: {
				ClientCertificateData: csr.ctxTLSCrt,
				ClientKeyData:         key,
			},
		},
		CurrentContext: ctx,
	}, nil
}

func (csr *CsrConfig) updateCsr(config *rest.Config, cli client.Client) error {
	var csrResource *csrv1.CertificateSigningRequest
	if csr.csr != nil {
		csrResource = csr.csr.DeepCopy()
	} else {
		csrName := fmt.Sprintf("sealos-generater-%s", csr.user)
		csrResource = &csrv1.CertificateSigningRequest{}
		csrResource.Name = csrName
		if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			insertCSR := csrResource.DeepCopy()
			insertCSR.ResourceVersion = "0"
			insertCSR.Spec.Request = csr.ctxTLSCsr
			insertCSR.Spec.SignerName = csrv1.KubeAPIServerClientSignerName
			insertCSR.Spec.ExpirationSeconds = &csr.expirationSeconds
			insertCSR.Spec.Groups = []string{"system:authenticated"}
			insertCSR.Spec.Usages = []csrv1.KeyUsage{
				"digital signature",
				"key encipherment",
				"client auth",
			}

			err := cli.Create(context.TODO(), insertCSR)
			if err != nil {
				if !errors.IsAlreadyExists(err) {
					return err
				}
			}
			csrResource = insertCSR.DeepCopy()
			return nil
		}); err != nil {
			return err
		}
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return err
	}

	csrResource.Status.Conditions = []csrv1.CertificateSigningRequestCondition{
		{
			Type:    csrv1.CertificateApproved,
			Status:  corev1.ConditionTrue,
			Reason:  "AutoApproved",
			Message: "This CSR was approved by user certificate approve.",
		},
	}
	_, err = clientset.CertificatesV1().CertificateSigningRequests().UpdateApproval(context.TODO(), csrResource.Name, csrResource, v1.UpdateOptions{})
	if err != nil {
		return err
	}

	w, err := clientset.CertificatesV1().CertificateSigningRequests().Watch(context.TODO(), v1.ListOptions{FieldSelector: fmt.Sprintf("metadata.name=%s", csrResource.Name)})
	if err != nil {
		return err
	}
	start := time.Now()
	for {
		select {
		case <-time.After(time.Second * 10):
			return errors.NewBadRequest("The CSR is not ready.")
		case event := <-w.ResultChan():
			if event.Type == watch.Modified || event.Type == watch.Added {
				certificateSigningRequest := event.Object.(*csrv1.CertificateSigningRequest)
				if certificateSigningRequest.Status.Certificate != nil {
					csr.ctxTLSCrt = certificateSigningRequest.Status.Certificate
					dis := time.Since(start).Milliseconds()
					defaultLog.Info("The csr is ready", "using Milliseconds", dis)
					return nil
				}
			}
		}
	}
}

// generateCSR will generate a new *x509.CertificateRequest template to be used
// by issuers that utilise CSRs to obtain Certificates.
// The CSR will not be signed, and should be passed to either EncodeCSR or
// to the x509.CreateCertificateRequest function.
func (csr *CsrConfig) generateCSR(key crypto.Signer) (*x509.CertificateRequest, []byte, error) {
	if len(csr.user) == 0 {
		return nil, nil, errors.NewBadRequest("must specify a CommonName")
	}

	var dnsNames []string
	var ips []net.IP

	dnsNames = append(dnsNames, csr.dnsNames...)
	ips = append(ips, csr.ipAddresses...)
	certTmpl := x509.CertificateRequest{
		Subject: pkix.Name{
			CommonName:   csr.user,
			Organization: csr.groups,
		},

		DNSNames:    dnsNames,
		IPAddresses: ips,
	}
	certDERBytes, err := x509.CreateCertificateRequest(rand.Reader, &certTmpl, key)
	if err != nil {
		return nil, nil, err
	}
	r1, r3 := x509.ParseCertificateRequest(certDERBytes)
	return r1, certDERBytes, r3
}
