// Copyright 2016 The Kubernetes Authors.
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

package cert

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"errors"
	"fmt"
	"math"
	"math/big"
	"net"
	"os"
	"path/filepath"
	"time"

	certutil "k8s.io/client-go/util/cert"
	"k8s.io/client-go/util/keyutil"
)

const (
	// PrivateKeyBlockType is a possible value for pem.Block.Type.
	PrivateKeyBlockType = "PRIVATE KEY"
	// PublicKeyBlockType is a possible value for pem.Block.Type.
	PublicKeyBlockType = "PUBLIC KEY"
	// CertificateBlockType is a possible value for pem.Block.Type.
	CertificateBlockType = "CERTIFICATE"
	// RSAPrivateKeyBlockType is a possible value for pem.Block.Type.
	RSAPrivateKeyBlockType = "RSA PRIVATE KEY"
	rsaKeySize             = 2048
	duration365d           = time.Hour * 24 * 365
)

// Config contains the basic fields required for creating a certificate
type Config struct {
	Path         string // Writeto Dir
	DefaultPath  string // Kubernetes default Dir
	BaseName     string // Writeto file name
	CAName       string // root ca map key
	CommonName   string
	Organization []string
	Year         time.Duration
	AltNames     AltNames
	Usages       []x509.ExtKeyUsage
}

// AltNames contains the domain names and IP addresses that will be added
// to the API Server's x509 certificate SubAltNames field. The values will
// be passed directly to the x509.Certificate object.
type AltNames struct {
	DNSNames map[string]string
	IPs      map[string]net.IP
}

// NewPrivateKey creates an RSA private key
func NewPrivateKey(keyType x509.PublicKeyAlgorithm) (crypto.Signer, error) {
	if keyType == x509.ECDSA {
		return ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	}

	return rsa.GenerateKey(rand.Reader, rsaKeySize)
}

// NewSelfSignedCACert creates a CA certificate
func NewSelfSignedCACert(key crypto.Signer, commonName string, organization []string, year time.Duration) (*x509.Certificate, error) {
	now := time.Now()
	tmpl := x509.Certificate{
		SerialNumber: new(big.Int).SetInt64(0),
		Subject: pkix.Name{
			CommonName:   commonName,
			Organization: organization,
		},
		NotBefore:             now.UTC(),
		NotAfter:              now.Add(duration365d * year).UTC(),
		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature | x509.KeyUsageCertSign,
		BasicConstraintsValid: true,
		IsCA:                  true,
	}

	certDERBytes, err := x509.CreateCertificate(rand.Reader, &tmpl, &tmpl, key.Public(), key)
	if err != nil {
		return nil, err
	}
	return x509.ParseCertificate(certDERBytes)
}

// NewCaCertAndKey Create as ca.
func NewCaCertAndKey(cfg Config) (*x509.Certificate, crypto.Signer, error) {
	_, err := os.Stat(pathForKey(cfg.Path, cfg.BaseName))
	if !os.IsNotExist(err) {
		return LoadCaCertAndKeyFromDisk(cfg)
	}

	key, err := NewPrivateKey(x509.UnknownPublicKeyAlgorithm)
	if err != nil {
		return nil, nil, fmt.Errorf("unable to create private key while generating CA certificate %s", err)
	}
	cert, err := NewSelfSignedCACert(key, cfg.CommonName, cfg.Organization, cfg.Year)
	if err != nil {
		return nil, nil, fmt.Errorf("unable to create ca cert %s", err)
	}
	return cert, key, nil
}

// LoadCaCertAndKeyFromDisk load ca cert and key form disk.
func LoadCaCertAndKeyFromDisk(cfg Config) (*x509.Certificate, crypto.Signer, error) {
	certs, err := certutil.CertsFromFile(pathForCert(cfg.Path, cfg.BaseName))
	if err != nil {
		return nil, nil, err
	}
	caCert := certs[0]

	cakey, err := TryLoadKeyFromDisk(pathForKey(cfg.Path, cfg.BaseName))
	if err != nil {
		return nil, nil, err
	}
	return caCert, cakey, nil
}

// TryLoadKeyFromDisk tries to load the key from the disk and validates that it is valid
func TryLoadKeyFromDisk(pkiPath string) (crypto.Signer, error) {
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

// NewCaCertAndKeyFromRoot cmd/kubeadm/app/util/pkiutil/pki_helpers.go NewCertAndKey
func NewCaCertAndKeyFromRoot(cfg Config, caCert *x509.Certificate, caKey crypto.Signer) (*x509.Certificate, crypto.Signer, error) {
	key, err := NewPrivateKey(x509.UnknownPublicKeyAlgorithm)
	if err != nil {
		return nil, nil, fmt.Errorf("unable to create private key while generating CA certificate %s", err)
	}
	cert, err := NewSignedCert(cfg, key, caCert, caKey)
	if err != nil {
		return nil, nil, fmt.Errorf("new signed cert failed %s", err)
	}

	return cert, key, nil
}

// NewSignedCert creates a signed certificate using the given CA certificate and key
func NewSignedCert(cfg Config, key crypto.Signer, caCert *x509.Certificate, caKey crypto.Signer) (*x509.Certificate, error) {
	serial, err := rand.Int(rand.Reader, new(big.Int).SetInt64(math.MaxInt64))
	if err != nil {
		return nil, err
	}
	if len(cfg.CommonName) == 0 {
		return nil, errors.New("must specify a CommonName")
	}
	if len(cfg.Usages) == 0 {
		return nil, errors.New("must specify at least one ExtKeyUsage")
	}

	var dnsNames []string
	var ips []net.IP

	for _, v := range cfg.AltNames.DNSNames {
		dnsNames = append(dnsNames, v)
	}
	for _, v := range cfg.AltNames.IPs {
		ips = append(ips, v)
	}
	certTmpl := x509.Certificate{
		Subject: pkix.Name{
			CommonName:   cfg.CommonName,
			Organization: cfg.Organization,
		},
		DNSNames:     dnsNames,
		IPAddresses:  ips,
		SerialNumber: serial,
		NotBefore:    caCert.NotBefore,
		NotAfter:     time.Now().Add(duration365d * cfg.Year).UTC(),
		KeyUsage:     x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  cfg.Usages,
	}
	certDERBytes, err := x509.CreateCertificate(rand.Reader, &certTmpl, caCert, key.Public(), caKey)
	if err != nil {
		return nil, err
	}
	return x509.ParseCertificate(certDERBytes)
}

// WriteTofile
// WriteCertAndKey stores certificate and key at the specified location
func WriteCertAndKey(pkiPath string, name string, cert *x509.Certificate, key crypto.Signer) error {
	if err := WriteKey(pkiPath, name, key); err != nil {
		return err
	}

	return WriteCert(pkiPath, name, cert)
}

// WriteCert stores the given certificate at the given location
func WriteCert(pkiPath, name string, cert *x509.Certificate) error {
	if cert == nil {
		return errors.New("certificate cannot be nil when writing to file")
	}

	certificatePath := pathForCert(pkiPath, name)
	if err := certutil.WriteCert(certificatePath, EncodeCertPEM(cert)); err != nil {
		return fmt.Errorf("unable to write certificate to file %s %s", certificatePath, err)
	}

	return nil
}

// EncodeCertPEM returns PEM-endcoded certificate data
func EncodeCertPEM(cert *x509.Certificate) []byte {
	block := pem.Block{
		Type:  CertificateBlockType,
		Bytes: cert.Raw,
	}
	return pem.EncodeToMemory(&block)
}

// WriteKey stores the given key at the given location
func WriteKey(pkiPath, name string, key crypto.Signer) error {
	if key == nil {
		return errors.New("private key cannot be nil when writing to file")
	}

	privateKeyPath := pathForKey(pkiPath, name)
	encoded, err := keyutil.MarshalPrivateKeyToPEM(key)
	if err != nil {
		return fmt.Errorf("unable to marshal private key to PEM %s", err)
	}
	if err := keyutil.WriteKey(privateKeyPath, encoded); err != nil {
		return fmt.Errorf("unable to write private key to file %s %s", privateKeyPath, err)
	}

	return nil
}

// WritePublicKey stores the given public key at the given location
func WritePublicKey(pkiPath, name string, key crypto.PublicKey) error {
	if key == nil {
		return errors.New("public key cannot be nil when writing to file")
	}

	publicKeyBytes, err := EncodePublicKeyPEM(key)
	if err != nil {
		return err
	}
	publicKeyPath := pathForPublicKey(pkiPath, name)
	if err := keyutil.WriteKey(publicKeyPath, publicKeyBytes); err != nil {
		return fmt.Errorf("unable to write public key to file %s %s", publicKeyPath, err)
	}

	return nil
}

func pathForPublicKey(pkiPath, name string) string {
	return filepath.Join(pkiPath, fmt.Sprintf("%s.pub", name))
}

// EncodePublicKeyPEM returns PEM-encoded public data
func EncodePublicKeyPEM(key crypto.PublicKey) ([]byte, error) {
	der, err := x509.MarshalPKIXPublicKey(key)
	if err != nil {
		return []byte{}, err
	}
	block := pem.Block{
		Type:  PublicKeyBlockType,
		Bytes: der,
	}
	return pem.EncodeToMemory(&block), nil
}

func pathForCert(pkiPath, name string) string {
	return filepath.Join(pkiPath, fmt.Sprintf("%s.crt", name))
}

func pathForKey(pkiPath, name string) string {
	return filepath.Join(pkiPath, fmt.Sprintf("%s.key", name))
}
