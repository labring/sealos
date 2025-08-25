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
	"net"
	"os"
	"time"

	csrv1 "k8s.io/api/certificates/v1"
	v1 "k8s.io/api/core/v1"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd/api"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

var defaultLog = ctrl.Log.WithName("kubeconfig")

type Interface interface {
	Apply(config *rest.Config, client client.Client) (*api.Config, error)
}

type CertConfig struct {
	*DefaultConfig
	caKeyFile   string
	groups      []string
	dnsNames    []string
	ipAddresses []net.IP
}

type CsrConfig struct {
	*DefaultConfig
	groups      []string
	dnsNames    []string
	ipAddresses []net.IP
	csr         *csrv1.CertificateSigningRequest
	ctxCAKey    []byte
	ctxTLSKey   []byte
	ctxTLSCrt   []byte
	ctxTLSCsr   []byte
}
type ServiceAccountConfig struct {
	*DefaultConfig
	namespace  string
	sa         *v1.ServiceAccount
	secretName string
}

type WebhookConfig struct {
	*DefaultConfig
	webhookURL string
}

func GetKubernetesHost(config *rest.Config) string {
	host, port := os.Getenv("SEALOS_CLOUD_HOST"), os.Getenv("APISERVER_PORT")
	if len(host) != 0 && len(port) != 0 {
		return "https://" + net.JoinHostPort(host, port)
	}
	host, port = os.Getenv("KUBERNETES_SERVICE_HOST"), os.Getenv("KUBERNETES_SERVICE_PORT")
	if len(host) == 0 || len(port) == 0 {
		return config.Host
	}
	return "https://" + net.JoinHostPort(host, port)
}

type DefaultConfig struct {
	user              string
	clusterName       string // default is kubernetes
	expirationSeconds int32
}

func NewConfig(user string, clusterName string, expirationSeconds int32) *DefaultConfig {
	if clusterName == "" {
		clusterName = "sealos"
	}
	if expirationSeconds == 0 {
		expirationSeconds = int32(2 * time.Hour.Seconds())
	}
	return &DefaultConfig{
		user:              user,
		clusterName:       clusterName,
		expirationSeconds: expirationSeconds,
	}
}

func (d *DefaultConfig) WithCertConfig(caKeyFile string, groups []string, dnsNames []string, ipAddrs []net.IP) Interface {
	return &CertConfig{
		DefaultConfig: d,
		caKeyFile:     caKeyFile,
		groups:        groups,
		dnsNames:      dnsNames,
		ipAddresses:   ipAddrs,
	}
}

func (d *DefaultConfig) WithCsrConfig(groups []string, dnsNames []string, ipAddrs []net.IP, csr *csrv1.CertificateSigningRequest) Interface {
	return &CsrConfig{
		DefaultConfig: d,
		groups:        groups,
		dnsNames:      dnsNames,
		ipAddresses:   ipAddrs,
		csr:           csr,
	}
}

func (d *DefaultConfig) WithServiceAccountConfig(namespace string, sa *v1.ServiceAccount) Interface {
	if namespace == "" {
		namespace = "default"
	}
	return &ServiceAccountConfig{
		DefaultConfig: d,
		namespace:     namespace,
		sa:            sa,
	}
}

func (d *DefaultConfig) WithWebhookConfigConfig(webhookURL string) Interface {
	return &WebhookConfig{
		DefaultConfig: d,
		webhookURL:    webhookURL,
	}
}
