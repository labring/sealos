package cert

import (
	"crypto"
	"crypto/x509"
	"fmt"
	"github.com/wonderivan/logger"
	"net"
	"os"
	"path"
)

var (
	kubeCertPath     = "/etc/kubernetes/pki"
	kubeCertEtcdPath = "/etc/kubernetes/pki/etcd"
)

func (meta *SealosCertMetaData) CaList() []Config {
	return []Config{
		{
			Path:         meta.CertPath,
			DefaultPath:  kubeCertPath,
			BaseName:     "ca",
			CommonName:   "kubernetes",
			Organization: nil,
			Year:         100,
			AltNames:     AltNames{},
			Usages:       nil,
		},
		{
			Path:         meta.CertPath,
			DefaultPath:  kubeCertPath,
			BaseName:     "front-proxy-ca",
			CommonName:   "front-proxy-ca",
			Organization: nil,
			Year:         100,
			AltNames:     AltNames{},
			Usages:       nil,
		},
		{
			Path:         meta.CertEtcdPath,
			DefaultPath:  kubeCertEtcdPath,
			BaseName:     "ca",
			CommonName:   "etcd-ca",
			Organization: nil,
			Year:         100,
			AltNames:     AltNames{},
			Usages:       nil,
		},
	}
}

func (meta *SealosCertMetaData) CertList() []Config {
	return []Config{
		{
			Path:         meta.CertPath,
			DefaultPath:  kubeCertPath,
			BaseName:     "apiserver",
			CAName:       "kubernetes",
			CommonName:   "kube-apiserver",
			Organization: nil,
			Year:         100,
			AltNames: AltNames{
				DNSNames: []string{
					"localhost",
					"kubernetes",
					"kubernetes.default",
					"kubernetes.default.svc",
				},
				IPs: []net.IP{
					{127, 0, 0, 1},
				},
			},
			Usages: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		},
		{
			Path:         meta.CertPath,
			DefaultPath:  kubeCertPath,
			BaseName:     "apiserver-kubelet-client",
			CAName:       "kubernetes",
			CommonName:   "kube-apiserver-kubelet-client",
			Organization: []string{"system:masters"},
			Year:         100,
			AltNames:     AltNames{},
			Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
		},
		{
			Path:         meta.CertPath,
			DefaultPath:  kubeCertPath,
			BaseName:     "front-proxy-client",
			CAName:       "front-proxy-ca",
			CommonName:   "front-proxy-client",
			Organization: nil,
			Year:         100,
			AltNames:     AltNames{},
			Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
		},
		{
			Path:         meta.CertPath,
			DefaultPath:  kubeCertPath,
			BaseName:     "apiserver-etcd-client",
			CAName:       "etcd-ca",
			CommonName:   "kube-apiserver-etcd-client",
			Organization: []string{"system:masters"},
			Year:         100,
			AltNames:     AltNames{},
			Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
		},
		{
			Path:         meta.CertEtcdPath,
			DefaultPath:  kubeCertEtcdPath,
			BaseName:     "server",
			CAName:       "etcd-ca",
			CommonName:   "etcd", // kubeadm using node name as common name cc.CommonName = mc.NodeRegistration.Name
			Organization: nil,
			Year:         100,
			AltNames:     AltNames{}, // need set altNames
			Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth, x509.ExtKeyUsageClientAuth},
		},
		{
			Path:         meta.CertEtcdPath,
			DefaultPath:  kubeCertEtcdPath,
			BaseName:     "peer",
			CAName:       "etcd-ca",
			CommonName:   "etcd-peer", // change this in filter
			Organization: nil,
			Year:         100,
			AltNames:     AltNames{}, // change this in filter
			Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth, x509.ExtKeyUsageClientAuth},
		},
		{
			Path:         meta.CertEtcdPath,
			DefaultPath:  kubeCertEtcdPath,
			BaseName:     "healthcheck-client",
			CAName:       "etcd-ca",
			CommonName:   "kube-etcd-healthcheck-client",
			Organization: []string{"system:masters"},
			Year:         100,
			AltNames:     AltNames{},
			Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
		},
	}
}

// 证书中需要用到的一些信息,传入的参数得提前验证
type SealosCertMetaData struct {
	APIServer    AltNames
	NodeName     string
	NodeIP       string
	CertPath     string
	CertEtcdPath string
	configFilter []func()
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

// apiServerIPAndDomains = MasterIP + VIP + CertSANS 暂时只有apiserver, 记得把cluster.local后缀加到apiServerIPAndDOmas里先
func NewSealosCertMetaData(certPATH, certEtcdPATH string, apiServerIPAndDomains []string, SvcCIDR, nodeName, nodeIP string) (*SealosCertMetaData, error) {
	data := &SealosCertMetaData{}
	data.configFilter = []func(){data.apiServerAltName, data.etcdAltAndCommonName}
	data.CertPath = certPATH
	data.CertEtcdPath = certEtcdPATH
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

	data.NodeIP = nodeIP
	data.NodeName = nodeName
	return data, nil
}

func (meta *SealosCertMetaData) apiServerAltName() {
	certList := meta.CertList()
	certList[APIserverCert].AltNames.DNSNames = append(certList[APIserverCert].AltNames.DNSNames,
		meta.APIServer.DNSNames...)
	certList[APIserverCert].AltNames.IPs = append(certList[APIserverCert].AltNames.IPs,
		meta.APIServer.IPs...)
}

func (meta *SealosCertMetaData) etcdAltAndCommonName() {
	certs := meta.CertList()
	altname := AltNames{
		DNSNames: []string{"localhost", meta.NodeName},
		IPs: []net.IP{
			{127, 0, 0, 1},
			net.ParseIP(meta.NodeIP).To4(),
			net.IPv6loopback,
		},
	}
	certs[EtcdServerCert].CommonName = meta.NodeName
	certs[EtcdServerCert].AltNames = altname
	certs[EtcdPeerCert].CommonName = meta.NodeName
	certs[EtcdPeerCert].AltNames = altname
}

// create sa.key sa.pub for service Account
func (meta *SealosCertMetaData) generatorServiceAccountKeyPaire() error {
	dir := meta.CertPath
	_, err := os.Stat(path.Join(dir, "sa.key"))
	if !os.IsNotExist(err) {
		logger.Info("sa.key sa.pub already exist")
		return nil
	}

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

func (meta *SealosCertMetaData) GenerateAll() error {
	cas := meta.CaList()
	certs := meta.CertList()
	meta.generatorServiceAccountKeyPaire()

	for _, f := range meta.configFilter {
		f()
	}

	CACerts := map[string]*x509.Certificate{}
	CAKeys := map[string]crypto.Signer{}
	for _, ca := range cas {
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

	for _, cert := range certs {
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
