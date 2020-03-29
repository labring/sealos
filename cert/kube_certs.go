package cert

import (
	"crypto"
	"crypto/x509"
	"fmt"
)

var caList = []Config{
	{
		Path:         "pki",
		BaseName:     "ca",
		CommonName:   "kubernetes",
		Organization: nil,
		Year:         100,
		AltNames:     AltNames{},
		Usages:       nil,
	},
	{
		Path:         "pki",
		BaseName:     "front-proxy-ca",
		CommonName:   "front-proxy-ca",
		Organization: nil,
		Year:         100,
		AltNames:     AltNames{},
		Usages:       nil,
	},
	{
		Path:         "pki/etcd",
		BaseName:     "ca",
		CommonName:   "etcd-ca",
		Organization: nil,
		Year:         100,
		AltNames:     AltNames{},
		Usages:       nil,
	},
}

var certList = []Config{
	{
		Path:         "pki",
		BaseName:     "apiserver",
		CAName:       "kubernetes",
		CommonName:   "kube-apiserver",
		Organization: nil,
		Year:         100,
		AltNames:     AltNames{}, // TODO need set altNames
		Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	},
	{
		Path:         "pki",
		BaseName:     "apiserver-kubelet-client",
		CAName:       "kubernetes",
		CommonName:   "kube-apiserver-kubelet-client",
		Organization: []string{"system:masters"},
		Year:         100,
		AltNames:     AltNames{},
		Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	},
	{
		Path:         "pki",
		BaseName:     "front-proxy-client",
		CAName:       "front-proxy-ca",
		CommonName:   "front-proxy-client",
		Organization: nil,
		Year:         100,
		AltNames:     AltNames{},
		Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	},
	{
		Path:         "pki",
		BaseName:     "apiserver-etcd-client",
		CAName:       "etcd-ca",
		CommonName:   "kube-apiserver-etcd-client",
		Organization: []string{"system:masters"},
		Year:         100,
		AltNames:     AltNames{},
		Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	},
	{
		Path:         "pki/etcd",
		BaseName:     "server",
		CAName:       "etcd-ca",
		CommonName:   "etcd", // TODO kubeadm using node name as common name cc.CommonName = mc.NodeRegistration.Name
		Organization: nil,
		Year:         100,
		AltNames:     AltNames{}, // TODO need set altNames
		Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth, x509.ExtKeyUsageClientAuth},
	},
	{
		Path:         "pki/etcd",
		BaseName:     "peer",
		CAName:       "etcd-ca",
		CommonName:   "etcd-peer", // TODO
		Organization: nil,
		Year:         100,
		AltNames:     AltNames{}, // TODO
		Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth, x509.ExtKeyUsageClientAuth},
	},
	{
		Path:         "pki/etcd",
		BaseName:     "healthcheck-client",
		CAName:       "etcd-ca",
		CommonName:   "kube-etcd-healthcheck-client",
		Organization: []string{"system:masters"},
		Year:         100,
		AltNames:     AltNames{},
		Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	},
}

// create sa.key sa.pub for service Account
func GenerateServiceAccountKeyPaire(dir string) error {
	key,err := NewPrivateKey(x509.RSA)
	if err != nil {
		return err
	}
	pub := key.Public()

	err = WriteKey(dir, "sa",key)
	if err != nil {
		return err
	}

	return WritePublicKey(dir,"sa",pub)
}

func GenerateAll() error {
	GenerateServiceAccountKeyPaire("pki")

	CACerts := map[string]*x509.Certificate{}
	CAKeys := map[string]crypto.Signer{}
	for _, ca := range caList {
		caCert, caKey, err := NewCaCertAndKey(ca)
		if err != nil {
			return err
		}
		CACerts[ca.CommonName] = caCert
		CAKeys[ca.CommonName] = caKey

		err = WriteCertAndKey(ca.Path, ca.BaseName, caCert, caKey)
		if err != nil {
			return err
		}
	}

	for _, cert := range certList {
		caCert,ok := CACerts[cert.CAName]
		if !ok {
			return fmt.Errorf("root ca cert not found %s",cert.CAName)
		}
		caKey,ok := CAKeys[cert.CAName]
		if !ok {
			return fmt.Errorf("root ca key not found %s",cert.CAName)
		}

		Cert,Key,err := NewCaCertAndKeyFromRoot(cert,caCert,caKey)
		if err != nil {
			return err
		}
		err = WriteCertAndKey(cert.Path,cert.BaseName,Cert,Key)
		if err != nil {
			return err
		}
	}
	return nil
}
