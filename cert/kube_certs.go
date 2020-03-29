package cert

import (
	"crypto"
	"crypto/x509"
	"fmt"
)

var (
	BasePath     = "pki"
	EtcdBasePath = "pki/etcd"
)

const (
	CA = iota
	FrontProxyCA
	EtcdCA
)

var caList = []Config{
	{
		Path:         BasePath,
		BaseName:     "ca",
		CommonName:   "kubernetes",
		Organization: nil,
		Year:         100,
		AltNames:     AltNames{},
		Usages:       nil,
	},
	{
		Path:         BasePath,
		BaseName:     "front-proxy-ca",
		CommonName:   "front-proxy-ca",
		Organization: nil,
		Year:         100,
		AltNames:     AltNames{},
		Usages:       nil,
	},
	{
		Path:         EtcdBasePath,
		BaseName:     "ca",
		CommonName:   "etcd-ca",
		Organization: nil,
		Year:         100,
		AltNames:     AltNames{},
		Usages:       nil,
	},
}

const (
	APIserverCert = iota
	APIserverKubeletClientCert
	FrontProxyClientCert
	APIserverEtcdClientCert
	EtcdServerCert
	EtcdPeerCert
	EtcdHealthcheckClientCert
)

var certList = []Config{
	{
		Path:         BasePath,
		BaseName:     "apiserver",
		CAName:       "kubernetes",
		CommonName:   "kube-apiserver",
		Organization: nil,
		Year:         100,
		AltNames:     AltNames{}, // TODO need set altNames
		Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
	},
	{
		Path:         BasePath,
		BaseName:     "apiserver-kubelet-client",
		CAName:       "kubernetes",
		CommonName:   "kube-apiserver-kubelet-client",
		Organization: []string{"system:masters"},
		Year:         100,
		AltNames:     AltNames{},
		Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	},
	{
		Path:         BasePath,
		BaseName:     "front-proxy-client",
		CAName:       "front-proxy-ca",
		CommonName:   "front-proxy-client",
		Organization: nil,
		Year:         100,
		AltNames:     AltNames{},
		Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	},
	{
		Path:         BasePath,
		BaseName:     "apiserver-etcd-client",
		CAName:       "etcd-ca",
		CommonName:   "kube-apiserver-etcd-client",
		Organization: []string{"system:masters"},
		Year:         100,
		AltNames:     AltNames{},
		Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	},
	{
		Path:         EtcdBasePath,
		BaseName:     "server",
		CAName:       "etcd-ca",
		CommonName:   "etcd", // TODO kubeadm using node name as common name cc.CommonName = mc.NodeRegistration.Name
		Organization: nil,
		Year:         100,
		AltNames:     AltNames{}, // TODO need set altNames
		Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth, x509.ExtKeyUsageClientAuth},
	},
	{
		Path:         EtcdBasePath,
		BaseName:     "peer",
		CAName:       "etcd-ca",
		CommonName:   "etcd-peer", // TODO
		Organization: nil,
		Year:         100,
		AltNames:     AltNames{}, // TODO
		Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth, x509.ExtKeyUsageClientAuth},
	},
	{
		Path:         EtcdBasePath,
		BaseName:     "healthcheck-client",
		CAName:       "etcd-ca",
		CommonName:   "kube-etcd-healthcheck-client",
		Organization: []string{"system:masters"},
		Year:         100,
		AltNames:     AltNames{},
		Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
	},
}

// 证书中需要用到的一些信息
type SealosCertMetaData struct {
	MasterIP []string
	VIP []string
	// TODO other needs metadata
}

func apiServerAltName(meta *SealosCertMetaData){
	cfg := certList[APIserverCert]
	//TODO add altname in cfg
	_ = cfg
}

func etcdServer(meta *SealosCertMetaData) {
	cfg := certList[EtcdServerCert]
	//TODO add altname in cfg
	_ = cfg
}

func etcdPeer(meta *SealosCertMetaData){
	cfg := certList[EtcdPeerCert]
	//TODO add altname in cfg
	_ = cfg
}

var configFilter = []func(meta *SealosCertMetaData)(){apiServerAltName,etcdServer,etcdPeer}

// create sa.key sa.pub for service Account
func GenerateServiceAccountKeyPaire(dir string) error {
	key, err := NewPrivateKey(x509.RSA)
	if err != nil {
		return err
	}
	pub := key.Public()

	err = WriteKey(dir, "sa", key)
	if err != nil {
		return err
	}

	return WritePublicKey(dir, "sa", pub)
}

func GenerateAll(meta *SealosCertMetaData) error {
	GenerateServiceAccountKeyPaire(BasePath)

	for _,f := range configFilter {
		f(meta)
	}

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
		caCert, ok := CACerts[cert.CAName]
		if !ok {
			return fmt.Errorf("root ca cert not found %s", cert.CAName)
		}
		caKey, ok := CAKeys[cert.CAName]
		if !ok {
			return fmt.Errorf("root ca key not found %s", cert.CAName)
		}

		Cert, Key, err := NewCaCertAndKeyFromRoot(cert, caCert, caKey)
		if err != nil {
			return err
		}
		err = WriteCertAndKey(cert.Path, cert.BaseName, Cert, Key)
		if err != nil {
			return err
		}
	}
	return nil
}
