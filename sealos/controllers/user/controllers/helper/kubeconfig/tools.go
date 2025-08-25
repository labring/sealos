/*
Copyright 2023 cuisongliu@qq.com.

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
	"crypto/rand"
	"crypto/x509"
	"encoding/pem"
	"fmt"
)

// DecodeX509CertificateChainBytes will decode a PEM encoded x509 Certificate chain.
func DecodeX509CertificateChainBytes(certBytes []byte) ([]*x509.Certificate, error) {
	var certs []*x509.Certificate

	var block *pem.Block

	for {
		// decode the tls certificate pem
		block, certBytes = pem.Decode(certBytes)
		if block == nil {
			break
		}

		// parse the tls certificate
		cert, err := x509.ParseCertificate(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("error parsing TLS certificate: %s", err.Error())
		}
		certs = append(certs, cert)
	}

	if len(certs) == 0 {
		return nil, fmt.Errorf("error decoding certificate PEM block")
	}

	return certs, nil
}

// DecodeX509CertificateBytes will decode a PEM encoded x509 Certificate.
func DecodeX509CertificateBytes(certBytes []byte) (*x509.Certificate, error) {
	certs, err := DecodeX509CertificateChainBytes(certBytes)
	if err != nil {
		return nil, err
	}

	return certs[0], nil
}

func GetRandomString(n int) string {
	randBytes := make([]byte, n/2)
	if _, err := rand.Read(randBytes); err != nil {
		return ""
	}
	return fmt.Sprintf("%x", randBytes)
}

func SecretName(name string) string {
	return fmt.Sprintf("sealos-token-%s-%s", name, GetRandomString(5))
}
