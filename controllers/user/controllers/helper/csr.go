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

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
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

func (csr *CSR) newSignedToCsrKey() (csrData, keyPEM []byte, err error) {
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

type CSR struct {
	*Config
	data struct {
		CAKey  []byte
		TLSKey []byte
		TLSCrt []byte
		TLSCsr []byte
	}
}

func (csr *CSR) KubeConfig(config *rest.Config, client client.Client) (*api.Config, error) {
	csrKey, key, err := csr.newSignedToCsrKey()
	if err != nil {
		return nil, err
	}
	// make sure cadata is loaded into config under incluster mode
	if err = rest.LoadTLSFiles(config); err != nil {
		return nil, err
	}
	ca := config.CAData
	csr.data.CAKey = ca
	csr.data.TLSKey = key
	csr.data.TLSCsr = csrKey
	if err = csr.updateCsr(config, client); err != nil {
		return nil, err
	}
	ctx := fmt.Sprintf("%s@%s", csr.User, csr.ClusterName)
	return &api.Config{
		Clusters: map[string]*api.Cluster{
			csr.ClusterName: {
				Server:                   GetKubernetesHost(config),
				CertificateAuthorityData: ca,
			},
		},
		Contexts: map[string]*api.Context{
			ctx: {
				Cluster:   csr.ClusterName,
				AuthInfo:  csr.User,
				Namespace: GetUsersNamespace(csr.User),
			},
		},
		AuthInfos: map[string]*api.AuthInfo{
			csr.User: {
				ClientCertificateData: csr.data.TLSCrt,
				ClientKeyData:         key,
			},
		},
		CurrentContext: ctx,
	}, nil
}

func (csr *CSR) updateCsr(config *rest.Config, cli client.Client) error {
	csrName := fmt.Sprintf("sealos-generater-%s", csr.User)
	label := map[string]string{
		"csr-name": csrName,
	}
	csrResource := &csrv1.CertificateSigningRequest{}
	csrResource.Name = csrName

	user := &userv1.User{}
	err := cli.Get(context.TODO(), client.ObjectKey{Name: csr.User}, user)
	if err == nil {
		ref := v1.OwnerReference{
			APIVersion: userv1.GroupVersion.String(),
			Kind:       "User",
			UID:        user.GetUID(),
			Name:       user.GetName(),
		}
		csrResource.OwnerReferences = append(csrResource.OwnerReferences, ref)
		csrName = fmt.Sprintf("%s-%d", csrName, user.Generation)
		csrResource.Name = csrName
		label = map[string]string{
			"csr-name": csrName,
		}
	}

	if err = retry.RetryOnConflict(retry.DefaultRetry, func() error {
		insertCSR := csrResource.DeepCopy()
		insertCSR.Labels = label
		insertCSR.ResourceVersion = "0"
		insertCSR.Spec.Request = csr.data.TLSCsr
		insertCSR.Spec.SignerName = csrv1.KubeAPIServerClientSignerName
		insertCSR.Spec.ExpirationSeconds = &csr.ExpirationSeconds
		insertCSR.Spec.Groups = []string{"system:authenticated"}
		insertCSR.Spec.Usages = []csrv1.KeyUsage{
			"digital signature",
			"key encipherment",
			"client auth",
		}

		err = cli.Create(context.TODO(), insertCSR)
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
	_, err = clientset.CertificatesV1().CertificateSigningRequests().UpdateApproval(context.TODO(), csrName, csrResource, v1.UpdateOptions{})
	if err != nil {
		return err
	}

	w, err := clientset.CertificatesV1().CertificateSigningRequests().Watch(context.TODO(), v1.ListOptions{LabelSelector: "csr-name=" + csrName})
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
					csr.data.TLSCrt = certificateSigningRequest.Status.Certificate
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
func (csr *CSR) generateCSR(key crypto.Signer) (*x509.CertificateRequest, []byte, error) {
	if len(csr.User) == 0 {
		return nil, nil, errors.NewBadRequest("must specify a CommonName")
	}

	var dnsNames []string
	var ips []net.IP

	dnsNames = append(dnsNames, csr.DNSNames...)
	ips = append(ips, csr.IPAddresses...)
	certTmpl := x509.CertificateRequest{
		Subject: pkix.Name{
			CommonName:   csr.User,
			Organization: csr.Groups,
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
