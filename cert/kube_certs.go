package cert

import (
	"crypto"
	"crypto/x509"
	"fmt"
	"net"
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
		AltNames:     AltNames{
			DNSNames: []string{
				"apiserver.cluster.local",
				"localhost",
				"sealyun.com",
				"master",
				"kubernetes",
				"kubernetes.default",
				"kubernetes.default.svc",
			},
			IPs: []net.IP{
				{127,0,0,1},
			},
		},
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

// 证书中需要用到的一些信息,传入的参数得提前验证
type SealosCertMetaData struct {
	APIServer   AltNames
	ETCD        AltNames
	NodeName    string
	NodeIP	    string
}

// apiServerIPAndDomains = MasterIP + VIP + CertSANS 暂时只有apiserver, 记得把cluster.local后缀加到apiServerIPAndDOmas里先
func NewSealosCertMetaData(apiServerIPAndDomains []string, SvcCIDR string) (*SealosCertMetaData, error) {
	data := &SealosCertMetaData{}
	svcFirstIP, _, err := net.ParseCIDR(SvcCIDR)
	if err != nil {
		return nil, err
	}
	svcFirstIP[len(svcFirstIP)-1]++ //取svc第一个ip
	data.APIServer.IPs = append(data.APIServer.IPs, svcFirstIP)

	for _, altName := range apiServerIPAndDomains {
		ip := net.ParseIP(altName)
		if ip != nil {
			data.APIServer.IPs = append(data.APIServer.IPs, ip)
			continue
		}
		data.APIServer.DNSNames = append(data.APIServer.DNSNames, altName)
	}
	return data, nil
}

func apiServerAltName(meta *SealosCertMetaData) {
	certList[APIserverCert].AltNames.DNSNames = append(certList[APIserverCert].AltNames.DNSNames,
		meta.APIServer.DNSNames...)
	certList[APIserverCert].AltNames.IPs = append(certList[APIserverCert].AltNames.IPs,
		meta.APIServer.IPs...)
}

func etcdAltAndCommonName(meta *SealosCertMetaData) {
	altname := AltNames{
		DNSNames: []string{"localhost",meta.NodeName},
		IPs:      []net.IP{
			{127,0,0,1},
			net.ParseIP(meta.NodeIP).To4(),
			net.IPv6loopback,
		},
	}
	certList[EtcdServerCert].CommonName = meta.NodeName
	certList[EtcdServerCert].AltNames = altname
	certList[EtcdPeerCert].CommonName = meta.NodeName
	certList[EtcdPeerCert].AltNames = altname
}

var configFilter = []func(meta *SealosCertMetaData){apiServerAltName, etcdAltAndCommonName}

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

	for _, f := range configFilter {
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
