// Copyright © 2021 sealos.
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
	"crypto/x509"
	"fmt"
	"net"
	"os"
	"path"
	"strings"

	utilnet "k8s.io/utils/net"

	"github.com/labring/sealos/pkg/utils/logger"
)

var (
	KubeDefaultCertPath     = "/etc/kubernetes/pki"
	kubeDefaultCertEtcdPath = "/etc/kubernetes/pki/etcd"
)

func CaList(CertPath, CertEtcdPath string) []Config {
	return []Config{
		{
			Path:         CertPath,
			DefaultPath:  KubeDefaultCertPath,
			BaseName:     "ca",
			CommonName:   "kubernetes",
			Organization: nil,
			Year:         100,
			AltNames:     AltNames{},
			Usages:       nil,
		},
		{
			Path:         CertPath,
			DefaultPath:  KubeDefaultCertPath,
			BaseName:     "front-proxy-ca",
			CommonName:   "front-proxy-ca",
			Organization: nil,
			Year:         100,
			AltNames:     AltNames{},
			Usages:       nil,
		},
		{
			Path:         CertEtcdPath,
			DefaultPath:  kubeDefaultCertEtcdPath,
			BaseName:     "ca",
			CommonName:   "etcd-ca",
			Organization: nil,
			Year:         100,
			AltNames:     AltNames{},
			Usages:       nil,
		},
	}
}

func List(CertPath, CertEtcdPath string) []Config {
	return []Config{
		{
			Path:         CertPath,
			DefaultPath:  KubeDefaultCertPath,
			BaseName:     "apiserver",
			CAName:       "kubernetes",
			CommonName:   "kube-apiserver",
			Organization: nil,
			Year:         100,
			AltNames: AltNames{
				DNSNames: map[string]string{
					"localhost":              "localhost",
					"kubernetes":             "kubernetes",
					"kubernetes.default":     "kubernetes.default",
					"kubernetes.default.svc": "kubernetes.default.svc",
				},
				IPs: map[string]net.IP{
					"127.0.0.1": net.IPv4(127, 0, 0, 1),
				},
			},
			Usages: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		},
		{
			Path:         CertPath,
			DefaultPath:  KubeDefaultCertPath,
			BaseName:     "apiserver-kubelet-client",
			CAName:       "kubernetes",
			CommonName:   "kube-apiserver-kubelet-client",
			Organization: []string{"system:masters"},
			Year:         100,
			AltNames:     AltNames{},
			Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
		},
		{
			Path:         CertPath,
			DefaultPath:  KubeDefaultCertPath,
			BaseName:     "front-proxy-client",
			CAName:       "front-proxy-ca",
			CommonName:   "front-proxy-client",
			Organization: nil,
			Year:         100,
			AltNames:     AltNames{},
			Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
		},
		{
			Path:         CertPath,
			DefaultPath:  KubeDefaultCertPath,
			BaseName:     "apiserver-etcd-client",
			CAName:       "etcd-ca",
			CommonName:   "kube-apiserver-etcd-client",
			Organization: []string{"system:masters"},
			Year:         100,
			AltNames:     AltNames{},
			Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth},
		},
		{
			Path:         CertEtcdPath,
			DefaultPath:  kubeDefaultCertEtcdPath,
			BaseName:     "server",
			CAName:       "etcd-ca",
			CommonName:   "etcd", // kubeadm using node name as common name cc.CommonName = mc.NodeRegistration.Name
			Organization: nil,
			Year:         100,
			AltNames:     AltNames{}, // need set altNames
			Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth, x509.ExtKeyUsageClientAuth},
		},
		{
			Path:         CertEtcdPath,
			DefaultPath:  kubeDefaultCertEtcdPath,
			BaseName:     "peer",
			CAName:       "etcd-ca",
			CommonName:   "etcd-peer", // change this in filter
			Organization: nil,
			Year:         100,
			AltNames:     AltNames{}, // change this in filter
			Usages:       []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth, x509.ExtKeyUsageClientAuth},
		},
		{
			Path:         CertEtcdPath,
			DefaultPath:  kubeDefaultCertEtcdPath,
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
	APIServer AltNames
	NodeName  string
	NodeIP    string
	DNSDomain string
	//证书生成的位置
	CertPath     string
	CertEtcdPath string
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
func NewSealosCertMetaData(certPATH, certEtcdPATH string, apiServerIPAndDomains []string, SvcCIDR, nodeName, nodeIP, DNSDomain string) (*SealosCertMetaData, error) {
	data := &SealosCertMetaData{}
	data.CertPath = certPATH
	data.CertEtcdPath = certEtcdPATH
	data.DNSDomain = DNSDomain
	data.APIServer.IPs = make(map[string]net.IP)
	data.APIServer.DNSNames = make(map[string]string)

	for _, svcCidr := range strings.Split(SvcCIDR, ",") {
		_, svcNet, err := net.ParseCIDR(svcCidr)
		if err != nil {
			return nil, err
		}
		svcFirstIP, err := utilnet.GetIndexedIP(svcNet, 1)
		if err != nil {
			return nil, err
		}
		data.APIServer.IPs[svcFirstIP.String()] = svcFirstIP
	}

	for _, altName := range apiServerIPAndDomains {
		ip := net.ParseIP(altName)
		if ip != nil {
			data.APIServer.IPs[ip.String()] = ip
			continue
		}
		data.APIServer.DNSNames[altName] = altName
	}
	if ip := net.ParseIP(nodeIP); ip != nil {
		data.APIServer.IPs[ip.String()] = ip
	}

	data.NodeIP = nodeIP
	data.NodeName = nodeName
	return data, nil
}

func (meta *SealosCertMetaData) apiServerAltName(certList *[]Config) {
	for _, dns := range meta.APIServer.DNSNames {
		(*certList)[APIserverCert].AltNames.DNSNames[dns] = dns
	}

	svcDNS := fmt.Sprintf("kubernetes.default.svc.%s", meta.DNSDomain)
	(*certList)[APIserverCert].AltNames.DNSNames[svcDNS] = svcDNS
	(*certList)[APIserverCert].AltNames.DNSNames[meta.NodeName] = meta.NodeName

	for _, ip := range meta.APIServer.IPs {
		(*certList)[APIserverCert].AltNames.IPs[ip.String()] = ip
	}
	logger.Info("apiserver altNames : %v", (*certList)[APIserverCert].AltNames)
}

func (meta *SealosCertMetaData) etcdAltAndCommonName(certList *[]Config) {
	altname := AltNames{
		DNSNames: map[string]string{
			"localhost":   "localhost",
			meta.NodeName: meta.NodeName,
		},
		IPs: map[string]net.IP{
			net.IPv4(127, 0, 0, 1).String():   net.IPv4(127, 0, 0, 1),
			net.ParseIP(meta.NodeIP).String(): net.ParseIP(meta.NodeIP),
			net.IPv6loopback.String():         net.IPv6loopback,
		},
	}
	(*certList)[EtcdServerCert].CommonName = meta.NodeName
	(*certList)[EtcdServerCert].AltNames = altname
	(*certList)[EtcdPeerCert].CommonName = meta.NodeName
	(*certList)[EtcdPeerCert].AltNames = altname

	logger.Info("Etcd altnames : %v, commonName : %s", (*certList)[EtcdPeerCert].AltNames, (*certList)[EtcdPeerCert].CommonName)
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
	cas := CaList(meta.CertPath, meta.CertEtcdPath)
	certs := List(meta.CertPath, meta.CertEtcdPath)
	meta.apiServerAltName(&certs)
	meta.etcdAltAndCommonName(&certs)
	_ = meta.generatorServiceAccountKeyPaire()

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
