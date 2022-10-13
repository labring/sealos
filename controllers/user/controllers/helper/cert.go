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
	"crypto"
	"crypto/ecdsa"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math"
	"math/big"
	"net"
	"time"

	"sigs.k8s.io/controller-runtime/pkg/client"

	"k8s.io/client-go/rest"

	"k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/client-go/util/cert"
	"k8s.io/client-go/util/keyutil"
)

// tryLoadKeyFromDisk tries to load the key from the disk and validates that it is valid
func tryLoadKeyFromDisk(pkiPath string) (crypto.Signer, error) {
	// Parse the private key from a file
	privKey, err := keyutil.PrivateKeyFromFile(pkiPath)
	if err != nil {
		return nil, fmt.Errorf("couldn't load the private key file %s", err)
	}

	// Allow RSA and ECDSA formats only
	var key crypto.Signer
	switch k := privKey.(type) {
	case *rsa.PrivateKey:
		key = k
	case *ecdsa.PrivateKey:
		key = k
	default:
		return nil, fmt.Errorf("couldn't convert the private key file %s", err)
	}

	return key, nil
}

// encodeCertPEM returns PEM-endcoded certificate data
func encodeCertPEM(cert *x509.Certificate) []byte {
	block := pem.Block{
		Type:  "CERTIFICATE",
		Bytes: cert.Raw,
	}
	return pem.EncodeToMemory(&block)
}

type Cert struct {
	*Config
}

func (c *Cert) KubeConfig(config *rest.Config, client client.Client) (*api.Config, error) {
	// make sure cadata is loaded into config under incluster mode
	if err := rest.LoadTLSFiles(config); err != nil {
		return nil, err
	}
	certs, err := cert.ParseCertsPEM(config.CAData)
	if err != nil {
		return nil, fmt.Errorf("error reading by config:  %s", err.Error())
	}
	caCert := certs[0]
	caKey, err := tryLoadKeyFromDisk(c.CAKeyFile)
	if err != nil {
		return nil, fmt.Errorf("load ca key file failed %s", err)
	}
	clientCert, clientKey, err := newCertAndKey(caCert, caKey, c.User, c.Groups, c.DNSNames, c.IPAddresses, c.ExpirationSeconds)
	if err != nil {
		return nil, fmt.Errorf("new client key failed %s", err)
	}
	encodedClientKey, err := keyutil.MarshalPrivateKeyToPEM(clientKey)
	if err != nil {
		return nil, fmt.Errorf("encode client key failed %s", err)
	}
	encodedClientCert := encodeCertPEM(clientCert)
	ctx := fmt.Sprintf("%s@%s", c.User, c.ClusterName)
	return &api.Config{
		Clusters: map[string]*api.Cluster{
			c.ClusterName: {
				Server:                   GetKubernetesHost(config),
				CertificateAuthorityData: encodeCertPEM(caCert),
			},
		},
		Contexts: map[string]*api.Context{
			ctx: {
				Cluster:   c.ClusterName,
				AuthInfo:  c.User,
				Namespace: GetUsersNamespace(c.User),
			},
		},
		AuthInfos: map[string]*api.AuthInfo{
			c.User: {
				ClientCertificateData: encodedClientCert,
				ClientKeyData:         encodedClientKey,
			},
		},
		CurrentContext: ctx,
	}, nil
}

func newCertAndKey(caCert *x509.Certificate, caKey crypto.Signer, user string, groups []string, DNSNames []string, IPAddresses []net.IP, expiration int32) (*x509.Certificate, crypto.Signer, error) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		return nil, nil, fmt.Errorf("generate client key error %s", err)
	}
	serial, err := rand.Int(rand.Reader, new(big.Int).SetInt64(math.MaxInt64))
	if err != nil {
		return nil, nil, fmt.Errorf("rand serial error %s", err)
	}

	noAfter := time.Now().Add(time.Second * time.Duration(expiration))

	certTmpl := x509.Certificate{
		Subject: pkix.Name{
			CommonName:   user,
			Organization: groups,
		},
		DNSNames:     DNSNames,
		IPAddresses:  IPAddresses,
		SerialNumber: serial,
		NotBefore:    caCert.NotBefore,
		NotAfter:     noAfter,
		KeyUsage:     x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	}
	certDERBytes, err := x509.CreateCertificate(rand.Reader, &certTmpl, caCert, key.Public(), caKey)
	if err != nil {
		return nil, nil, fmt.Errorf("create cert failed %s", err)
	}
	cert, err := x509.ParseCertificate(certDERBytes)
	if err != nil {
		return nil, nil, fmt.Errorf("parse cert failed %s", err)
	}
	return cert, key, nil
}
